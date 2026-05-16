import { Injectable } from '@nestjs/common';
import { BillingService } from '../billing/billing.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

type ReadOnlyToolName =
  | 'get_workspace_summary'
  | 'get_workspace_links'
  | 'get_billing_status'
  | 'list_members';

@Injectable()
export class AssistantContextService {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly billingService: BillingService,
  ) {}

  async buildReadOnlyContext(userId: string, workspaceId: string, prompt: string) {
    const toolPlan = this.resolveToolPlan(prompt);
    const workspace = await this.workspacesService.findOne(userId, workspaceId);

    const sections = [
      this.buildWorkspaceGuideSection(),
      this.buildWorkspaceSummarySection(workspace),
      this.buildWorkspaceLinksSection(workspace.slug),
    ];

    if (toolPlan.includes('get_billing_status')) {
      sections.push(
        await this.safeSection(() => this.buildBillingSection(userId, workspaceId, workspace.slug), 'Billing Status'),
      );
    }

    if (toolPlan.includes('list_members')) {
      sections.push(
        await this.safeSection(() => this.buildMembersSection(userId, workspaceId, workspace.slug), 'Members'),
      );
    }

    return sections.filter(Boolean).join('\n\n');
  }

  private resolveToolPlan(prompt: string): ReadOnlyToolName[] {
    const normalized = prompt.toLowerCase();
    const toolPlan = new Set<ReadOnlyToolName>(['get_workspace_summary', 'get_workspace_links']);

    if (/(billing|factur|plan|suscrip|credito|pago|portal)/.test(normalized)) {
      toolPlan.add('get_billing_status');
    }

    if (/(miembr|usuario|owner|admin|team|equipo|invita|invitacion|rol)/.test(normalized)) {
      toolPlan.add('list_members');
    }

    if (/(workspace|resumen|estado|overview|panel|dashboard|ayuda|link|ruta)/.test(normalized)) {
      toolPlan.add('get_billing_status');
      toolPlan.add('list_members');
    }

    return Array.from(toolPlan);
  }

  private buildWorkspaceGuideSection() {
    return [
      '## ReadOnly Agent Rules',
      '- Usa solo la informacion real de este contexto del workspace.',
      '- No inventes estados, URLs o acciones que no aparezcan aqui.',
      '- Si mencionas una seccion del panel, incluye la ruta exacta cuando exista.',
      '- Eres read-only: puedes orientar, resumir y recomendar, pero no afirmar que ejecutaste cambios.',
    ].join('\n');
  }

  private buildWorkspaceSummarySection(workspace: any) {
    const memberCount = workspace.members?.length || 0;
    const ownerName = [workspace.owner?.first_name, workspace.owner?.last_name].filter(Boolean).join(' ').trim();

    return [
      '## Workspace Summary',
      `- id: ${workspace.id}`,
      `- name: ${workspace.name}`,
      `- slug: ${workspace.slug}`,
      `- plan: ${workspace.plan}`,
      `- status: ${workspace.status}`,
      `- website: ${workspace.website || 'no configurado'}`,
      `- owner: ${ownerName || workspace.owner?.email || 'desconocido'}`,
      `- members: ${memberCount}`,
    ].join('\n');
  }

  private buildWorkspaceLinksSection(workspaceSlug: string) {
    return [
      '## Workspace Links',
      `- [Overview](/workspaces/${workspaceSlug})`,
      `- [Billing](/workspaces/${workspaceSlug}/billing)`,
      `- [Miembros](/workspaces/${workspaceSlug}/members)`,
      `- [Settings](/workspaces/${workspaceSlug}/settings)`,
      `- [Support](/workspaces/${workspaceSlug}/support)`,
    ].join('\n');
  }

  private async buildBillingSection(userId: string, workspaceId: string, workspaceSlug: string) {
    const billing = await this.billingService.getWorkspaceBillingStatus(userId, workspaceId);

    return [
      '## Billing Status',
      `- plan: ${billing.plan}`,
      `- plan_status: ${billing.planStatus}`,
      `- active: ${billing.isActive ? 'si' : 'no'}`,
      `- credit_balance: ${billing.creditBalance}`,
      `- [Abrir billing](/workspaces/${workspaceSlug}/billing)`,
    ].join('\n');
  }

  private async buildMembersSection(userId: string, workspaceId: string, workspaceSlug: string) {
    const members = await this.workspacesService.getMembers(userId, workspaceId);

    if (members.length === 0) {
      return ['## Members', '- No hay miembros adicionales en este workspace.'].join('\n');
    }

    return [
      '## Members',
      ...members.slice(0, 12).map((member: any) => {
        const fullName = [member.user?.first_name, member.user?.last_name].filter(Boolean).join(' ').trim();
        return `- ${fullName || member.user?.email || member.user_id} | role=${member.role} | email=${member.user?.email || 'sin email'} | [Abrir miembros](/workspaces/${workspaceSlug}/members)`;
      }),
    ].join('\n');
  }

  private async safeSection(factory: () => Promise<string>, title: string) {
    try {
      return await factory();
    } catch {
      return `## ${title}\n- No disponible para este usuario o workspace.`;
    }
  }
}
