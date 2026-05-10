import { Component, OnInit, PLATFORM_ID, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, UserInfo } from '../../services/auth.service';
import { DashboardService, CourseItem, PendingGradeItem, RegistrationRequest } from '../../services/dashboard.service';

@Component({
  selector: 'app-instructor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './instructor-dashboard.html',
  styleUrl: './instructor-dashboard.css',
})
export class InstructorDashboardComponent implements OnInit {
  user: UserInfo | null = null;
  activeNav = 'panel';
  loading = true;

  courses: CourseItem[] = [];
  pendingGrades: PendingGradeItem[] = [];
  activeSemester = '';
  registrationRequests: RegistrationRequest[] = [];
  feedbackMap: Record<string, string> = {};
  reviewingId: string | null = null;

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
    if (!this.user) return;

    this.dashService.getInstructorCourses(this.user.identifier).subscribe({
      next: (res) => {
        this.courses = res.courses ?? [];
        this.activeSemester = res.semester ?? '';
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); },
    });

    this.dashService.getPendingGrades(this.user.identifier).subscribe({
      next: (res) => { this.pendingGrades = res.pending ?? []; this.cdr.detectChanges(); },
      error: () => {},
    });

    this.dashService.getRegistrationRequests(this.user.identifier).subscribe({
      next: (res) => { this.registrationRequests = res.requests ?? []; this.cdr.detectChanges(); },
      error: () => {},
    });
  }

  get pendingRequestCount(): number {
    return this.registrationRequests.filter(r => r.status === 'pending').length;
  }

  get pendingRequests(): RegistrationRequest[] {
    return this.registrationRequests.filter(r => r.status === 'pending');
  }

  review(req: RegistrationRequest, action: 'approve' | 'reject'): void {
    if (this.reviewingId === req.id) return;
    this.reviewingId = req.id;
    const feedback = this.feedbackMap[req.id] ?? '';
    this.dashService.reviewRegistrationRequest(req.id, this.user!.identifier, action, feedback).subscribe({
      next: () => {
        req.status   = action === 'approve' ? 'approved' : 'rejected';
        req.feedback = feedback || null;
        this.reviewingId = null;
      },
      error: () => { this.reviewingId = null; },
    });
  }

  todaySchedule(): { start: string; end: string; code: string; name: string; section: string; room: string; count: number }[] {
    const days: Record<number, string> = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
    const today = days[new Date().getDay()];
    const result: any[] = [];
    for (const c of this.courses) {
      for (const slot of c.schedule) {
        if (slot.day === today) {
          result.push({ start: slot.start_time, end: slot.end_time, code: c.course_code, name: c.course_name, section: c.section, room: slot.classroom, count: c.enrolled_count });
        }
      }
    }
    return result.sort((a, b) => a.start.localeCompare(b.start));
  }

  get firstName(): string {
    return this.user?.full_name?.split(' ').slice(-1)[0] ?? '';
  }

  get totalStudents(): number {
    return this.courses.reduce((s, c) => s + c.enrolled_count, 0);
  }

  setNav(nav: string) { this.activeNav = nav; }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
