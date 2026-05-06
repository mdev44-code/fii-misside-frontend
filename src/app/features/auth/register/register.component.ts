import {Component, inject, OnInit, signal} from '@angular/core';
import {AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators} from "@angular/forms";
import {AuthService} from "../../../core/auth/auth.service";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {ToastService} from "../../../core/services/toast.service";
import {NgOptimizedImage} from "@angular/common";

/** Validateur : les deux mots de passe doivent être identiques */
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password && confirm && password !== confirm
    ? { passwordMismatch: true }
    : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NgOptimizedImage
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  mounted = signal(false);
  loading = signal(false);
  showPassword = signal(false);
  errorMessage = signal('');
  currentStep = signal(1);
  token = signal<string | null>(null);

  form = this.fb.group(
    {
      full_name: ['', [Validators.required, Validators.minLength(2)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator }
  );

  ngOnInit() {
    const t = this.route.snapshot.queryParamMap.get('token');
    this.token.set(t);
    setTimeout(() => this.mounted.set(true), 50);
  }

  isInvalid(field: 'full_name' | 'password' | 'confirmPassword'): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  confirmInvalid(): boolean {
    const ctrl = this.form.get('confirmPassword');
    return !!(ctrl?.touched && this.form.hasError('passwordMismatch'));
  }

  passwordStrength(): number {
    const pwd = this.form.get('password')?.value ?? '';
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  }

  strengthLabel(): string {
    const labels = ['', 'Faible', 'Moyen', 'Fort', 'Très fort'];
    return labels[this.passwordStrength()] ?? '';
  }

  goToStep2() {
    const ctrl = this.form.get('full_name');
    ctrl?.markAsTouched();
    if (ctrl?.valid) {
      this.currentStep.set(2);
    }
  }

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.token()) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const { full_name, password } = this.form.getRawValue();

    this.auth
      .register({ token: this.token()!, full_name: full_name!, password: password! })
      .subscribe({
        next: () => {
          this.toast.success('Compte créé avec succès. Bienvenue !');
          this.router.navigate(['/']);
        },
        error: (err) => {
          const msg =
            err?.error?.message ||
            err?.error?.detail ||
            'Une erreur est survenue. Vérifiez votre lien d\'invitation.';
          this.errorMessage.set(msg);
          this.loading.set(false);
        },
      });
  }
}
