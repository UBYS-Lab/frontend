import { Component, OnInit, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-qr-checkin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './qr-checkin.html',
  styleUrl: './qr-checkin.css',
})
export class QrCheckinComponent implements OnInit {
  state: 'login' | 'loading' | 'success' | 'already' | 'error' = 'login';
  message = '';
  courseName = '';
  date = '';
  token = '';

  loginId = '';
  loginPw = '';
  loginLoading = false;
  loginError = '';

  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private dashService: DashboardService,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) { this.state = 'error'; this.message = 'Geçersiz QR bağlantısı.'; return; }

    const user = this.auth.getUser();
    if (user?.role === 'student') {
      this.doCheckin(user.identifier);
    }
    this.cdr.detectChanges();
  }

  submitLogin(): void {
    if (!this.loginId.trim() || !this.loginPw.trim()) return;
    this.loginLoading = true;
    this.loginError = '';
    this.cdr.detectChanges();
    this.auth.login(this.loginId.trim(), this.loginPw).subscribe({
      next: () => {
        this.loginLoading = false;
        const user = this.auth.getUser();
        if (user?.role === 'student') {
          this.doCheckin(user.identifier);
        } else {
          this.loginError = 'Sadece öğrenci hesabı ile giriş yapılabilir.';
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.loginLoading = false;
        this.loginError = err?.error?.message ?? 'Kullanıcı adı veya şifre hatalı.';
        this.cdr.detectChanges();
      },
    });
  }

  private doCheckin(studentNo: string): void {
    this.state = 'loading';
    this.cdr.detectChanges();
    this.dashService.qrCheckin(this.token, studentNo).subscribe({
      next: (res) => {
        this.state      = res.already ? 'already' : 'success';
        this.message    = res.message ?? '';
        this.courseName = res.course_name ?? '';
        this.date       = res.date ?? '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.state   = 'error';
        this.message = err?.error?.message ?? 'Bir hata oluştu.';
        this.cdr.detectChanges();
      },
    });
  }

  goToDashboard(): void { this.router.navigate(['/student/dashboard']); }
  retry(): void { this.state = 'login'; this.loginError = ''; this.message = ''; }
}
