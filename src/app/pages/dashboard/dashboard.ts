import { Component, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, UserInfo } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  student: UserInfo | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.student = this.authService.getUser();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}