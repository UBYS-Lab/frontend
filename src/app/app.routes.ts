import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { StudentDashboardComponent } from './pages/student-dashboard/student-dashboard';
import { InstructorDashboardComponent } from './pages/instructor-dashboard/instructor-dashboard';
import { ManagerDashboardComponent } from './pages/manager-dashboard/manager-dashboard';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '',      component: LoginComponent },
  { path: 'login', component: LoginComponent },
  {
    path: 'student/dashboard',
    component: StudentDashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'instructor/dashboard',
    component: InstructorDashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'manager/dashboard',
    component: ManagerDashboardComponent,
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'login' },
];