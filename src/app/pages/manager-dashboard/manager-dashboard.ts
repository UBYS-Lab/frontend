import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, UserInfo } from '../../services/auth.service';
import { DashboardService, ManagerStats, ActivityItem, AnnouncementItem } from '../../services/dashboard.service';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manager-dashboard.html',
  styleUrl: './manager-dashboard.css',
})
export class ManagerDashboardComponent implements OnInit {
  user: UserInfo | null = null;
  activeNav = 'panel';
  loading = true;

  stats: ManagerStats = { students: 0, instructors: 0, courses: 0, departments: 0 };
  recentActivities: ActivityItem[] = [];
  announcements: AnnouncementItem[] = [];

  attOverview: any[] = [];
  attOverviewTotal = 0;
  attOverviewLoading = false;

  private cdr = inject(ChangeDetectorRef);

  statCards: { label: string; key: keyof ManagerStats; color: string }[] = [
    { label: 'TOPLAM ÖĞRENCİ',  key: 'students',    color: 'blue'   },
    { label: 'AKADEMİSYEN',     key: 'instructors', color: 'purple' },
    { label: 'AKTİF DERS',      key: 'courses',     color: 'teal'   },
    { label: 'BÖLÜM',           key: 'departments', color: 'orange' },
  ];

  constructor(
    private authService: AuthService,
    private dashService: DashboardService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();

    this.dashService.getManagerStats().subscribe({
      next: (res) => { this.stats = res.stats; this.loading = false; },
      error: () => { this.loading = false; },
    });

    this.dashService.getManagerActivities().subscribe({
      next: (res) => { this.recentActivities = res.activities ?? []; },
      error: () => {},
    });

    this.dashService.getManagerAnnouncements().subscribe({
      next: (res) => { this.announcements = res.announcements ?? []; },
      error: () => {},
    });
  }

  get roleLabel(): string {
    const r = this.user?.manager_role;
    if (r === 'rector')           return 'Rektör';
    if (r === 'dean')             return 'Dekan';
    if (r === 'department_chair') return 'Bölüm Başkanı';
    return 'Yönetici';
  }

  get firstName(): string {
    return this.user?.full_name?.split(' ').slice(-1)[0] ?? '';
  }

  setNav(nav: string) {
    this.activeNav = nav;
    if (nav === 'devamsizlik' && this.attOverview.length === 0 && !this.attOverviewLoading) {
      this.attOverviewLoading = true;
      this.dashService.getManagerAttendanceOverview().subscribe({
        next: (res) => {
          this.attOverview = res.courses ?? [];
          this.attOverviewTotal = res.total_sessions ?? 0;
          this.attOverviewLoading = false;
          this.cdr.detectChanges();
        },
        error: () => { this.attOverviewLoading = false; this.cdr.detectChanges(); },
      });
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
