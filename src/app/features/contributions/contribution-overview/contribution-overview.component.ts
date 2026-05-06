import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {CommonModule} from "@angular/common";
import {RouterLink} from "@angular/router";
import {NavbarComponent} from "../../../shared/components/navbar/navbar.component";
import {BottomNavComponent} from "../../../shared/components/bottom-nav/bottom-nav.component";
import {FcfaPipe} from "../../../shared/pipes/fcfa.pipe";
import {ApiService} from "../../../core/services/api.service";
import {AuthService} from "../../../core/auth/auth.service";
import {Contribution} from "../../../shared/models";
import {catchError, of} from "rxjs";

@Component({
  selector: 'app-contribution-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, BottomNavComponent, FcfaPipe],
  templateUrl: './contribution-overview.component.html',
  styleUrl: './contribution-overview.component.scss'
})
export class ContributionOverviewComponent implements OnInit{
  private api = inject(ApiService);
  auth        = inject(AuthService);

  loading       = signal(true);
  contributions = signal<Contribution[]>([]);

  // Filtre actif
  activeFilter = signal<'all' | 'confirmed' | 'pending' | 'late'>('all');

  filtered = computed(() => {
    const f = this.activeFilter();
    if (f === 'all') return this.contributions();
    if (f === 'pending') return this.contributions().filter(c =>
      c.status === 'pending' || c.status === 'declared'
    );
    return this.contributions().filter(c => c.status === f);
  });

  stats = computed(() => {
    const all = this.contributions();
    return {
      total:     all.length,
      confirmed: all.filter(c => c.status === 'confirmed').length,
      declared:  all.filter(c => c.status === 'declared').length,
      pending:   all.filter(c => c.status === 'pending').length,
      late:      all.filter(c => c.status === 'late').length,
      totalAmount: all
        .filter(c => c.status === 'confirmed' && c.amount)
        .reduce((s, c) => s + (c.amount ?? 0), 0),
    };
  });

  ngOnInit() {
    this.api.get<Contribution[]>('/contributions/me')
      .pipe(catchError(() => of([] as Contribution[])))
      .subscribe(list => {
        const sorted = [...list].sort((a, b) =>
          b.contribution_year !== a.contribution_year
            ? b.contribution_year - a.contribution_year
            : b.contribution_month - a.contribution_month
        );
        this.contributions.set(sorted);
        this.loading.set(false);
      });
  }

  monthLabel(c: Contribution): string {
    return new Date(c.contribution_year, c.contribution_month - 1)
      .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      confirmed: 'Confirmée', declared: 'Déclarée',
      pending: 'En attente', late: 'En retard',
    };
    return map[status] ?? status;
  }

  isCurrentMonth(c: Contribution): boolean {
    const now = new Date();
    return c.contribution_month === now.getMonth() + 1 &&
      c.contribution_year === now.getFullYear();
  }
}
