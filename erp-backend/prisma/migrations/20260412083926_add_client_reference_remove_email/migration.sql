/*
  Warnings:

  - You are about to drop the `assistant_models` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `departments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `distritos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `instances` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `provincias` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `servers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "clients" DROP CONSTRAINT "clients_district_id_fkey";

-- DropForeignKey
ALTER TABLE "distritos" DROP CONSTRAINT "distritos_province_id_fkey";

-- DropForeignKey
ALTER TABLE "instances" DROP CONSTRAINT "instances_server_id_fkey";

-- DropForeignKey
ALTER TABLE "instances" DROP CONSTRAINT "instances_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "provincias" DROP CONSTRAINT "provincias_department_id_fkey";

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "reference" TEXT;

-- DropTable
DROP TABLE "assistant_models";

-- DropTable
DROP TABLE "departments";

-- DropTable
DROP TABLE "distritos";

-- DropTable
DROP TABLE "instances";

-- DropTable
DROP TABLE "provincias";

-- DropTable
DROP TABLE "servers";
