import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface CompanyUser {
  userId: string;
  claveUsuario: string;
  nombre: string;
  apaterno: string | null;
  amaterno: string | null;
  email: string | null;
  oficina: string | null;
  nombreCompleto: string;
  warehouseName: string | null;
  departmentName: string | null;
}

export interface DepartmentGroup {
  department: string;
  users: CompanyUser[];
  collapsed?: boolean;
}

export interface WarehouseGroup {
  warehouse: string;
  departments: DepartmentGroup[];
  collapsed?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);

  private readonly _users = signal<CompanyUser[]>([]);
  private readonly _searchQuery = signal('');
  private readonly _loading = signal(false);
  private readonly _expandedGroups = signal<Set<string>>(new Set());

  readonly users = this._users.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly filteredUsers = computed(() => {
    const q = this._searchQuery().toLowerCase();
    const all = this._users();
    if (!q) return all;
    return all.filter(
      (u) =>
        u.nombreCompleto.toLowerCase().includes(q) ||
        u.claveUsuario.toLowerCase().includes(q) ||
        (u.warehouseName ?? '').toLowerCase().includes(q) ||
        (u.departmentName ?? '').toLowerCase().includes(q),
    );
  });

  readonly groupedUsers = computed(() => {
    const users = this.filteredUsers();
    const warehouseMap = new Map<string, Map<string, CompanyUser[]>>();

    for (const user of users) {
      const warehouse = user.warehouseName || 'Sin Ciudad';
      const department = user.departmentName || 'Sin Departamento';

      if (!warehouseMap.has(warehouse)) {
        warehouseMap.set(warehouse, new Map());
      }
      const deptMap = warehouseMap.get(warehouse)!;
      if (!deptMap.has(department)) {
        deptMap.set(department, []);
      }
      deptMap.get(department)!.push(user);
    }

      return Array.from(warehouseMap.entries())
        .map(([warehouse, deptMap]) => ({
          warehouse,
          collapsed: !this._expandedGroups().has(warehouse),
          departments: Array.from(deptMap.entries())
            .map(([department, users]) => ({
              department,
              users,
              collapsed: !this._expandedGroups().has(`${warehouse}|${department}`)
            }))
            .sort((a, b) => a.department.localeCompare(b.department))
        }))
        .sort((a, b) => a.warehouse.localeCompare(b.warehouse));
  });

  setSearchQuery(q: string): void {
    this._searchQuery.set(q);
  }

  toggleGroup(groupId: string): void {
    const current = this._expandedGroups();
    const newSet = new Set(current);
    if (newSet.has(groupId)) {
      newSet.delete(groupId);
    } else {
      newSet.add(groupId);
    }
    this._expandedGroups.set(newSet);
  }

  isGroupCollapsed(groupId: string): boolean {
    return !this._expandedGroups().has(groupId);
  }

  async loadUsers(force: boolean = false): Promise<void> {
    // Implement caching: Only fetch if empty or forced
    if (this._users().length > 0 && !force) return;

    this._loading.set(true);
    try {
      const users = await firstValueFrom(
        this.http.get<CompanyUser[]>(`${environment.apiUrl}/users`),
      );
      this._users.set(users);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      this._loading.set(false);
    }
  }
}
