import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';

interface AssociationSettings {
  contribution_mode: 'free' | 'fixed';
  fixed_amount: number | null;
  currency: string;
  updated_at: string | null;
  updated_by_name: string | null;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, BottomNavComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  private api   = inject(ApiService);
  private toast = inject(ToastService);
  auth          = inject(AuthService);

  // ── State ─────────────────────────────────────────────────────────────────
  loading  = signal(true);
  saving   = signal(false);
  settings = signal<AssociationSettings | null>(null);

  // ── Formulaire (valeurs locales avant sauvegarde) ─────────────────────────
  mode        = signal<'free' | 'fixed'>('free');
  fixedAmount = signal<number | null>(null);

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.loading.set(true);
    this.api.get<AssociationSettings>('/contributions/settings').subscribe({
      next: (s) => {
        this.settings.set(s);
        this.mode.set(s.contribution_mode);
        this.fixedAmount.set(s.fixed_amount);
        this.loading.set(false);
      },
      error: () => {
        this.toast.show('Impossible de charger les paramètres', 'error');
        this.loading.set(false);
      },
    });
  }

  onModeChange(newMode: 'free' | 'fixed') {
    this.mode.set(newMode);
    if (newMode === 'free') {
      this.fixedAmount.set(null);
    }
  }

  onAmountInput(event: Event) {
    const val = (event.target as HTMLInputElement).valueAsNumber;
    this.fixedAmount.set(isNaN(val) ? null : val);
  }

  get isDirty(): boolean {
    const s = this.settings();
    if (!s) return false;
    if (this.mode() !== s.contribution_mode) return true;
    if (this.mode() === 'fixed' && this.fixedAmount() !== s.fixed_amount) return true;
    return false;
  }

  get isValid(): boolean {
    if (this.mode() === 'fixed') {
      const amt = this.fixedAmount();
      return amt !== null && amt > 0;
    }
    return true;
  }

  save() {
    if (!this.isDirty || !this.isValid || this.saving()) return;

    this.saving.set(true);
    const body = {
      contribution_mode: this.mode(),
      fixed_amount: this.mode() === 'fixed' ? this.fixedAmount() : null,
    };

    this.api.patch<AssociationSettings>('/contributions/settings', body).subscribe({
      next: (updated) => {
        this.settings.set(updated);
        this.saving.set(false);
        const label = this.mode() === 'fixed'
          ? `Mode fixe — ${this.fixedAmount()?.toLocaleString('fr-FR')} FCFA`
          : 'Mode libre';
        this.toast.show(`Paramètres enregistrés · ${label}`, 'success');
      },
      error: () => {
        this.saving.set(false);
        this.toast.show('Erreur lors de la sauvegarde', 'error');
      },
    });
  }

  reset() {
    const s = this.settings();
    if (!s) return;
    this.mode.set(s.contribution_mode);
    this.fixedAmount.set(s.fixed_amount);
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  }
}
