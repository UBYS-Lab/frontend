import { Component, OnInit, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, UserInfo } from '../../services/auth.service';
import { DashboardService, AvailableCourse } from '../../services/dashboard.service';

@Component({
  selector: 'app-course-registration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './course-registration.html',
  styleUrl: './course-registration.css',
})
export class CourseRegistrationComponent implements OnInit {
  user: UserInfo | null = null;
  loading = true;
  submitting = false;

  semester = '';
  creditsAllowed = 24;
  courses: AvailableCourse[] = [];
  selected = new Set<string>();

  existingRequest: any = null;
  successMsg = '';
  errorMsg = '';

  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private authService: AuthService,
    private dashService: DashboardService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.user = this.authService.getUser();
    if (!this.user) { this.router.navigate(['/login']); return; }

    this.dashService.getAvailableCourses(this.user.identifier).subscribe({
      next: (res) => {
        this.semester        = res.semester ?? '';
        this.creditsAllowed  = res.credits_allowed ?? 24;
        this.courses         = res.courses ?? [];
        this.existingRequest = res.existing_request ?? null;
        if (this.existingRequest) {
          (this.existingRequest.courses ?? []).forEach((c: any) => this.selected.add(c.course_code));
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); },
    });
  }

  toggleCourse(code: string): void {
    if (this.isSubmitted) return;
    const course = this.courses.find(c => c.course_code === code);
    if (!course || course.already_enrolled) return;

    if (this.selected.has(code)) {
      this.selected.delete(code);
    } else {
      const newTotal = this.selectedCredits + course.credits;
      if (newTotal > this.creditsAllowed) {
        this.errorMsg = `Maksimum ${this.creditsAllowed} kredi seçebilirsiniz.`;
        setTimeout(() => this.errorMsg = '', 3000);
        return;
      }
      this.selected.add(code);
    }
  }

  get selectedCredits(): number {
    return this.courses
      .filter(c => this.selected.has(c.course_code))
      .reduce((sum, c) => sum + c.credits, 0);
  }

  get isSubmitted(): boolean {
    return this.existingRequest?.status === 'pending' || this.existingRequest?.status === 'approved';
  }

  get statusLabel(): string {
    const s = this.existingRequest?.status;
    if (s === 'pending')  return 'Onay Bekleniyor';
    if (s === 'approved') return 'Onaylandı';
    if (s === 'rejected') return 'Reddedildi';
    return '';
  }

  scheduleLabel(course: AvailableCourse): string {
    const days: Record<string, string> = { Monday: 'Pzt', Tuesday: 'Sal', Wednesday: 'Çar', Thursday: 'Per', Friday: 'Cum' };
    return course.schedule.map(s => `${days[s.day] ?? s.day} ${s.start_time}`).join(' / ');
  }

  submit(): void {
    if (this.selected.size === 0 || this.submitting || this.isSubmitted) return;
    this.submitting = true;
    this.errorMsg   = '';

    this.dashService.submitRegistrationRequest(this.user!.identifier, [...this.selected]).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res.success) {
          this.successMsg      = 'Ders kaydı talebiniz iletildi. Hocanızın onayı bekleniyor.';
          this.existingRequest = { status: 'pending', courses: this.courses.filter(c => this.selected.has(c.course_code)) };
        } else {
          this.errorMsg = 'Bir hata oluştu, tekrar deneyin.';
        }
      },
      error: () => {
        this.submitting = false;
        this.errorMsg   = 'Sunucu hatası, tekrar deneyin.';
      },
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goToDashboard(): void {
    this.router.navigate(['/student/dashboard']);
  }
}
