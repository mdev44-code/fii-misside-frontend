import { Routes } from '@angular/router';
import {authGuard, publicGuard} from "./core/auth/auth.guard";
import {roleGuard} from "./core/auth/role.guard";

export const routes: Routes = [
  // ── Auth (public) ─────────────────────────────────────────────────────────
  {
    path: 'login',
    canActivate: [publicGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [publicGuard],
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },

  // ── App (protected) ───────────────────────────────────────────────────────
  {
    path: '',
    canActivate: [authGuard],
    // loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },

      // Membres
      {
        path: 'members',
        loadComponent: () => import('./features/members/member-list/member-list.component').then(m => m.MemberListComponent),
      },
      {
        path: 'members/org-chart',
        loadComponent: () => import('./features/members/org-chart/org-chart.component').then(m => m.OrgChartComponent),
      },
      {
        path: 'members/invite',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () => import('./features/members/invite-member/invite-member.component').then(m => m.InviteMemberComponent),
      },
      {
        path: 'members/group-invite',
        canActivate: [roleGuard(['admin'])],
        loadComponent: () =>
          import('./features/members/group-invite/group-invite.component').then(m => m.GroupInviteComponent),
      },
      {
        path: 'members/:id',
        loadComponent: () => import('./features/members/member-detail/member-detail.component').then(m => m.MemberDetailComponent),
      },

      // Trésorerie
      {
        path: 'treasury',
        loadComponent: () => import('./features/treasury/treasury-overview/treasury-overview.component').then(m => m.TreasuryOverviewComponent),
      },
      {
        path: 'treasury/actions',
        canActivate: [roleGuard(['treasurer', 'admin'])],
        loadComponent: () => import('./features/treasury/treasurer-actions/treasurer-actions.component').then(m => m.TreasurerActionsComponent),
      },

      // Cotisations
      {
        path: 'contributions',
        loadComponent: () => import('./features/contributions/contribution-overview/contribution-overview.component')
          .then(m => m.ContributionOverviewComponent),
      },
      {
        path: 'contributions/status',
        loadComponent: () => import('./features/contributions/contribution-status/contribution-status.component')
          .then(m => m.ContributionStatusComponent),
      },

      // Projets
      {
        path: 'projects',
        loadComponent: () => import('./features/projects/project-list/project-list.component').then(m => m.ProjectListComponent),
      },
      {
        path: 'projects/new',
        canActivate: [roleGuard(['manager', 'admin'])],
        loadComponent: () => import('./features/projects/project-form/project-form.component').then(m => m.ProjectFormComponent),
      },
      {
        path: 'projects/:id',
        loadComponent: () => import('./features/projects/project-detail/project-detail.component').then(m => m.ProjectDetailComponent),
      },
      {
        path: 'projects/:id/edit',
        canActivate: [roleGuard(['manager', 'admin'])],
        loadComponent: () => import('./features/projects/project-form/project-form.component').then(m => m.ProjectFormComponent),
      },

      // Notifications
      // {
      //   path: 'notifications',
      //   loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent),
      // },

      // Profil
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
      },
    ],
  },

  // Fallback
  { path: '**', redirectTo: '' },
];
