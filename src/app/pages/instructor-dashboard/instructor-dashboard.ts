import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, UserInfo } from '../../services/auth.service';
import { DashboardService, CourseItem, PendingGradeItem } from '../../services/dashboard.service';

@Component({
  selector: 'app-instructor-dashboard',
  standalone: true,
  imports: [],
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

  constructor(
    private authService: AuthService,
    private dashService: DashboardService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    if (!this.user) return;

    this.dashService.getInstructorCourses(this.user.identifier).subscribe({
      next: (res) => {
        this.courses = res.courses ?? [];
        this.activeSemester = res.semester ?? '';
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });

    this.dashService.getPendingGrades(this.user.identifier).subscribe({
      next: (res) => { this.pendingGrades = res.pending ?? []; },
      error: () => {},
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
