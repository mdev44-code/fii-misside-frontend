import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {ApiResponse, AppNotification, Contribution, Member, Project, TreasuryBalance} from "../../shared/models";
import {AuthService} from "../../core/auth/auth.service";
import {ApiService} from "../../core/services/api.service";
import {catchError, forkJoin, of} from "rxjs";
import {NavbarComponent} from "../../shared/components/navbar/navbar.component";
import {RelativeDatePipe} from "../../shared/pipes/relative-date.pipe";
import {FcfaPipe} from "../../shared/pipes/fcfa.pipe";
import {BadgeComponent} from "../../shared/components/badge/badge.component";
import {RouterLink} from "@angular/router";
import {BottomNavComponent} from "../../shared/components/bottom-nav/bottom-nav.component";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    NavbarComponent,
    RelativeDatePipe,
    FcfaPipe,
    BadgeComponent,
    RouterLink,
    BottomNavComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  auth    = inject(AuthService);
  private api = inject(ApiService);

  loading = signal(true);

  firstName = computed(() => {
    const name = this.auth.user()?.full_name;
    if (!name) return 'Membre';
    return name.split(' ').at(0) ?? 'Membre';
  });

  balance       = signal<number>(0);
  membersCount  = signal<number>(0);
  projectsCount = signal<number>(0);
  contributions = signal<Contribution[]>([]);

  private nowMonth = new Date().getMonth() + 1;
  private nowYear  = new Date().getFullYear();

  currentMonthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  hasCurrentMonth = computed(() =>
    this.contributions().some(
      c => c.contribution_month === this.nowMonth && c.contribution_year === this.nowYear
    )
  );

  monthLabel(c: Contribution): string {
    return new Date(c.contribution_year, c.contribution_month - 1)
      .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  isCurrentMonth(c: Contribution): boolean {
    return c.contribution_month === this.nowMonth && c.contribution_year === this.nowYear;
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      confirmed: 'Confirmée', declared: 'Déclarée',
      pending: 'En attente', late: 'En retard',
    };
    return map[status] ?? status;
  }

  monthInitial(c: Contribution): string {
    return new Date(c.contribution_year, c.contribution_month - 1)
      .toLocaleDateString('fr-FR', { month: 'short' })
      .slice(0, 3).toUpperCase();
  }

  today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  ngOnInit() {
    forkJoin({
      balance:  this.api.get<TreasuryBalance>('/treasury/balance').pipe(catchError(() => of(null as TreasuryBalance | null))),
      members:  this.api.get<Member[]>('/members').pipe(catchError(() => of([] as Member[]))),
      projects: this.api.get<Project[]>('/projects').pipe(catchError(() => of([] as Project[]))),
      contribs: this.api.get<Contribution[]>('/contributions/me').pipe(catchError(() => of([] as Contribution[]))),
    }).subscribe(({ balance, members, projects, contribs }) => {
      this.balance.set(balance?.balance ?? 0);
      this.membersCount.set(members.length);
      this.projectsCount.set(projects.length);
      const sorted = [...contribs].sort((a, b) =>
        b.contribution_year !== a.contribution_year
          ? b.contribution_year - a.contribution_year
          : b.contribution_month - a.contribution_month
      );
      this.contributions.set(sorted);
      this.loading.set(false);
    });
  }
}
