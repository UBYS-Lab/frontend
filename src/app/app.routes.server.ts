import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'student/dashboard',    renderMode: RenderMode.Client },
  { path: 'instructor/dashboard', renderMode: RenderMode.Client },
  { path: 'manager/dashboard',    renderMode: RenderMode.Client },
  { path: '**',                   renderMode: RenderMode.Prerender },
];
