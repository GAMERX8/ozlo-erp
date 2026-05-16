import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface Department {
  id: string;
  name: string;
}

interface Province {
  id: string;
  name: string;
}

interface District {
  id: string;
  name: string;
}

export function useUbigeo() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");

  const [loading, setLoading] = useState(false);

  // Cargar departamentos inicialmente
  useEffect(() => {
    async function loadDepartments() {
      try {
        const { data } = await apiClient.get('/ubigeo/departments');
        setDepartments(data);
      } catch (error) {
        console.error("Error loading departments:", error);
      }
    }
    loadDepartments();
  }, []);

  // Cargar provincias cuando cambia el departamento
  useEffect(() => {
    if (!selectedDepartment) {
      setProvinces([]);
      setDistricts([]);
      setSelectedProvince("");
      setSelectedDistrict("");
      return;
    }

    async function loadProvinces() {
      setLoading(true);
      try {
        const { data } = await apiClient.get(`/ubigeo/provinces/${selectedDepartment}`);
        setProvinces(data);
        setSelectedProvince("");
        setDistricts([]);
        setSelectedDistrict("");
      } catch (error) {
        console.error("Error loading provinces:", error);
      } finally {
        setLoading(false);
      }
    }
    loadProvinces();
  }, [selectedDepartment]);

  // Cargar distritos cuando cambia la provincia
  useEffect(() => {
    if (!selectedProvince) {
      setDistricts([]);
      setSelectedDistrict("");
      return;
    }

    async function loadDistricts() {
      setLoading(true);
      try {
        const { data } = await apiClient.get(`/ubigeo/districts/${selectedProvince}`);
        setDistricts(data);
        setSelectedDistrict("");
      } catch (error) {
        console.error("Error loading districts:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDistricts();
  }, [selectedProvince]);

  return {
    departments,
    provinces,
    districts,
    selectedDepartment,
    setSelectedDepartment,
    selectedProvince,
    setSelectedProvince,
    selectedDistrict,
    setSelectedDistrict,
    loading
  };
}
