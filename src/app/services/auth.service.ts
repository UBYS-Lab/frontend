import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { tap } from 'rxjs/operators';

export interface UserInfo {
  role: 'student' | 'instructor' | 'manager';
  identifier: string;
  full_name: string;
  email: string | null;
  // student
  department_id?: number;
  class_year?: number;
  gpa?: number;
  status?: string;
  total_credits?: number;
  active_semester?: string;
  // instructor
  title?: string;
  // manager
  unit_type?: string;
  unit_id?: string | number;
  manager_role?: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data: { student: UserInfo };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API_URL = 'http://127.0.0.1:8001/api';
  private readonly STORAGE_KEY = 'ubys_user';

  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  login(identifier: string, password: string) {
    return this.http
      .post<LoginResponse>(`${this.API_URL}/auth/login`, {
        student_no: identifier,
        password,
      })
      .pipe(
        tap((res) => {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(res.data.student));
          }
        })
      );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  isLoggedIn(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return !!localStorage.getItem(this.STORAGE_KEY);
  }

  getUser(): UserInfo | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as UserInfo;
    } catch {
      localStorage.removeItem(this.STORAGE_KEY);
      return null;
    }
  }
}
