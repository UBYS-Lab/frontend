import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { tap } from 'rxjs/operators';

export interface StudentInfo {
  student_no: string;
  full_name: string;
  email: string;
  department_id: number;
  status: string;
  semester: number;
  gpa: number;
}

interface LoginResponse {
  success: boolean;
  student: StudentInfo;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API_URL = 'http://127.0.0.1:8001/api';
  private readonly STORAGE_KEY = 'ubys_student';

  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  login(studentNo: string, password: string) {
    return this.http
      .post<LoginResponse>(`${this.API_URL}/auth/login`, {
        student_no: studentNo,
        password,
      })
      .pipe(
        tap((res) => {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(res.student));
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

  getStudent(): StudentInfo | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? (JSON.parse(data) as StudentInfo) : null;
  }
}
