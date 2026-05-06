import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';

type LoginTab = 'phone' | 'email';

// ── Validateurs custom ────────────────────────────────────────
function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const val = (control.value ?? '').trim().replace(/\s/g, '');
  if (!val) return null; // laissé à `required`
  // Doit commencer par + et contenir uniquement des chiffres après
  const isPhone = /^\+\d{8,15}$/.test(val);
  return isPhone ? null : { invalidPhone: true };
}

function emailValidator(control: AbstractControl): ValidationErrors | null {
  const val = (control.value ?? '').trim();
  if (!val) return null;
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  return isEmail ? null : { invalidEmail: true };
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private fb    = inject(FormBuilder);
  private auth  = inject(AuthService);
  private router = inject(Router);
  private toast  = inject(ToastService);

  mounted      = signal(false);
  loading      = signal(false);
  showPassword = signal(false);
  errorMessage = signal('');
  activeTab    = signal<LoginTab>('phone');

  form = this.fb.nonNullable.group({
    identifier: ['', [Validators.required, phoneValidator]],
    password:   ['', [Validators.required]],
  });

  ngOnInit() {
    setTimeout(() => this.mounted.set(true), 60);
  }

  switchTab(tab: LoginTab) {
    this.activeTab.set(tab);
    this.errorMessage.set('');

    const ctrl = this.form.get('identifier')!;
    ctrl.reset('');

    // Met à jour le validateur selon l'onglet
    if (tab === 'phone') {
      ctrl.setValidators([Validators.required, phoneValidator]);
    } else {
      ctrl.setValidators([Validators.required, emailValidator]);
    }
    ctrl.updateValueAndValidity();
  }

  get placeholderText(): string {
    return this.activeTab() === 'phone' ? '+221 77 000 00 00' : 'exemple@email.com';
  }

  get identifierType(): string {
    return this.activeTab() === 'phone' ? 'tel' : 'email';
  }

  isInvalid(field: 'identifier' | 'password'): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  // Message d'erreur contextuel
  identifierError(): string {
    const ctrl = this.form.get('identifier');
    if (!ctrl?.touched || !ctrl?.invalid) return '';
    if (ctrl.hasError('required'))     return 'Ce champ est obligatoire';
    if (ctrl.hasError('invalidPhone')) return 'Format invalide. Exemple : +221771234567';
    if (ctrl.hasError('invalidEmail')) return 'Adresse email invalide';
    return 'Valeur incorrecte';
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMessage.set('');
    const { identifier, password } = this.form.getRawValue();

    this.auth.login({ identifier: identifier.trim(), password }).subscribe({
      next: () => {
        this.toast.success('Connexion réussie. Bienvenue !');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.errorMessage.set(
          err?.error?.message ?? err?.error?.detail ?? 'Identifiant ou mot de passe incorrect.'
        );
        this.loading.set(false);
      },
    });
  }
}
