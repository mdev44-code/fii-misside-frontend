import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {ApiService} from "../../../core/services/api.service";
import {AuthService} from "../../../core/auth/auth.service";
import {catchError, of} from "rxjs";
import {BottomNavComponent} from "../../../shared/components/bottom-nav/bottom-nav.component";
import {FcfaPipe} from "../../../shared/pipes/fcfa.pipe";
import {NavbarComponent} from "../../../shared/components/navbar/navbar.component";
import {RouterLink} from "@angular/router";



interface ContributionStatusResponse {
  member_id: string;
  full_name: string;
  phone_number: string;
  status: string;
  amount: number | null;
  expected_amount: number | null;
  contribution_mode: string;
  declared_at: string | null;
  confirmed_at: string | null;
  is_complete: boolean;
}

interface MonthlyReport {
  month: number;
  year: number;
  contribution_mode: string;
  fixed_amount: number | null;
  members: ContributionStatusResponse[];
  total_members: number;
  confirmed_count: number;
  declared_count: number;
  pending_count: number;
  late_count: number;
  total_collected: number;
}

@Component({
  selector: 'app-contribution-status',
  standalone: true,
  imports: [
    BottomNavComponent,
    FcfaPipe,
    NavbarComponent,
    RouterLink
  ],
  templateUrl: './contribution-status.component.html',
  styleUrl: './contribution-status.component.scss'
})
export class ContributionStatusComponent implements OnInit {
  private api = inject(ApiService);
  auth        = inject(AuthService);

  loading = signal(true);
  report  = signal<MonthlyReport | null>(null);

  selectedMonth = signal(new Date().getMonth() + 1);
  selectedYear  = signal(new Date().getFullYear());

  openDropdown = signal<string | null>(null);

  months = [
    { value: 1, label: 'Janvier' }, { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },     { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' }, { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' }, { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' }, { value: 12, label: 'Décembre' },
  ];

  years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Filtre membres
  activeFilter = signal<'all' | 'confirmed' | 'declared' | 'pending' | 'late'>('all');

  filteredMembers = computed(() => {
    const r = this.report();
    if (!r) return [];
    const f = this.activeFilter();
    if (f === 'all') return r.members;
    return r.members.filter(m => m.status === f);
  });

  progressPercent = computed(() => {
    const r = this.report();
    if (!r || r.total_members === 0) return 0;
    return Math.round((r.confirmed_count / r.total_members) * 100);
  });

  monthLabel(v: number): string {
    return this.months.find(m => m.value === v)?.label ?? '';
  }

  ngOnInit() {
    this.loadReport();
  }

  loadReport() {
    this.loading.set(true);
    this.api.get<MonthlyReport>('/contributions/status', {
      month: this.selectedMonth(),
      year: this.selectedYear(),
    })
      .pipe(catchError(() => of(null as MonthlyReport | null)))
      .subscribe(r => {
        this.report.set(r);
        this.loading.set(false);
      });
  }

  changeMonth(v: number) {
    this.selectedMonth.set(v);
    this.openDropdown.set(null);
    this.loadReport();
  }

  changeYear(v: number) {
    this.selectedYear.set(v);
    this.openDropdown.set(null);
    this.loadReport();
  }

  toggleDropdown(name: string, e: Event) {
    e.stopPropagation();
    this.openDropdown.set(this.openDropdown() === name ? null : name);
  }

  closeDropdowns() { this.openDropdown.set(null); }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      confirmed: 'Confirmée', declared: 'Déclarée',
      pending: 'En attente', late: 'En retard',
    };
    return map[status] ?? status;
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('');
  }
}
