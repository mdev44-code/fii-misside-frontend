import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {ApiService} from "../../../core/services/api.service";
import {AuthService} from "../../../core/auth/auth.service";
import {Transaction, TreasuryBalance} from "../../../shared/models";
import {catchError, of} from "rxjs";
import {CommonModule} from "@angular/common";
import {RouterLink} from "@angular/router";
import {NavbarComponent} from "../../../shared/components/navbar/navbar.component";
import {BottomNavComponent} from "../../../shared/components/bottom-nav/bottom-nav.component";
import {FcfaPipe} from "../../../shared/pipes/fcfa.pipe";

interface TransactionPage {
  transactions: Transaction[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

@Component({
  selector: 'app-treasury-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, BottomNavComponent, FcfaPipe],
  templateUrl: './treasury-overview.component.html',
  styleUrl: './treasury-overview.component.scss'
})
export class TreasuryOverviewComponent implements OnInit {
  private api = inject(ApiService);
  auth        = inject(AuthService);

  loadingBalance = signal(true);
  loadingTx      = signal(true);

  balance      = signal<TreasuryBalance | null>(null);
  transactions = signal<Transaction[]>([]);
  totalPages   = signal(1);
  currentPage  = signal(1);
  totalTx      = signal(0);

  // Filtre actif : all | deposit | expense
  activeFilter = signal<'all' | 'deposit' | 'expense'>('all');

  // Stats calculées depuis les transactions chargées
  stats = computed(() => {
    const txs = this.transactions();
    const deposits = txs.filter(t => t.type === 'deposit');
    const expenses = txs.filter(t => t.type === 'expense');
    return {
      totalDeposits: deposits.reduce((s, t) => s + t.amount, 0),
      totalExpenses: expenses.reduce((s, t) => s + t.amount, 0),
      countDeposits: deposits.length,
      countExpenses: expenses.length,
    };
  });

  ngOnInit() {
    this.loadBalance();
    this.loadTransactions();
  }

  setFilter(f: 'all' | 'deposit' | 'expense') {
    this.activeFilter.set(f);
    this.currentPage.set(1);
    this.loadTransactions();
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.loadTransactions();
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = {
      deposit: 'Cotisation', expense: 'Dépense', adjustment: 'Ajustement',
    };
    return map[type] ?? type;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit',
    });
  }

  private loadBalance() {
    this.api.get<TreasuryBalance>('/treasury/balance')
      .pipe(catchError(() => of(null as TreasuryBalance | null)))
      .subscribe(b => { this.balance.set(b); this.loadingBalance.set(false); });
  }

  private loadTransactions() {
    this.loadingTx.set(true);
    const params: Record<string, string | number> = {
      page: this.currentPage(),
      per_page: 15,
    };
    if (this.activeFilter() !== 'all') params['type'] = this.activeFilter();

    this.api.get<TransactionPage>('/treasury/transactions', params)
      .pipe(catchError(() => of(null as TransactionPage | null)))
      .subscribe(res => {
        this.transactions.set(res?.transactions ?? []);
        this.totalPages.set(res?.total_pages ?? 1);
        this.totalTx.set(res?.total ?? 0);
        this.loadingTx.set(false);
      });
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }
}
