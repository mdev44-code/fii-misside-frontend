import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';

type Step = 'email' | 'code' | 'password' | 'success';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  private readonly auth   = inject(AuthService);
  private readonly toast  = inject(ToastService);
  private readonly router = inject(Router);

  // ── État des étapes ───────────────────────────────────────────────────────
  step = signal<Step>('email');

  // ── Champs ────────────────────────────────────────────────────────────────
  email        = '';
  code         = '';
  newPassword  = '';
  confirmPassword = '';
  showPassword = signal(false);
  showConfirm  = signal(false);

  // ── État UI ───────────────────────────────────────────────────────────────
  loading  = signal(false);
  error    = signal('');

  // Conservé en mémoire entre étape 2 et 3
  private resetToken = '';

  // ── Étape 1 : envoyer le code ─────────────────────────────────────────────
  submitEmail(): void {
    this.error.set('');
    if (!this.email.trim()) {
      this.error.set('Veuillez saisir votre adresse email.');
      return;
    }
    this.loading.set(true);
    this.auth.forgotPassword(this.email.trim().toLowerCase()).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set('code');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Une erreur est survenue.');
      },
    });
  }

  // ── Étape 2 : vérifier le code ────────────────────────────────────────────
  submitCode(): void {
    this.error.set('');
    if (this.code.trim().length !== 6) {
      this.error.set('Le code doit contenir exactement 6 chiffres.');
      return;
    }
    this.loading.set(true);
    this.auth.verifyResetCode(this.email.trim().toLowerCase(), this.code.trim()).subscribe({
      next: (data) => {
        this.loading.set(false);
        this.resetToken = data.reset_token;
        this.step.set('password');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Code incorrect ou expiré.');
      },
    });
  }

  // ── Étape 3 : nouveau mot de passe ────────────────────────────────────────
  submitPassword(): void {
    this.error.set('');
    if (this.newPassword.length < 8) {
      this.error.set('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('Les deux mots de passe ne correspondent pas.');
      return;
    }
    this.loading.set(true);
    this.auth.resetPassword(this.resetToken, this.newPassword, this.confirmPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set('success');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Une erreur est survenue.');
      },
    });
  }

  // ── Renvoyer le code ──────────────────────────────────────────────────────
  resendCode(): void {
    this.code  = '';
    this.error.set('');
    this.loading.set(true);
    this.auth.forgotPassword(this.email.trim().toLowerCase()).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Un nouveau code a été envoyé.');
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Impossible de renvoyer le code. Réessayez dans une minute.');
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
