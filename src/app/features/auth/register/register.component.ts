import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators} from "@angular/forms";
import {AuthService} from "../../../core/auth/auth.service";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {ToastService} from "../../../core/services/toast.service";
import {NgOptimizedImage} from "@angular/common";
import {GroupInviteValidationResponse} from "../../../shared/models";

export interface Country {
  code: string;
  iso: string;
  name: string;
  flag: string;
  localDigits: number;
}

export const ALLOWED_COUNTRIES: Country[] = [
  { code: '+221', iso: 'SN', name: 'Sénégal', flag: '🇸🇳', localDigits: 9 },
  { code: '+224', iso: 'GN', name: 'Guinée',  flag: '🇬🇳', localDigits: 9 },
];

// ── Validateurs ──────────────────────────────────────────────────────────────

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm  = control.get('confirmPassword')?.value;
  return password && confirm && password !== confirm
    ? { passwordMismatch: true }
    : null;
}

/**
 * Valide les chiffres locaux saisis par l'utilisateur.
 * L'indicatif est géré par le sélecteur séparé — on n'en tient pas compte ici.
 */
function phoneLocalValidator(control: AbstractControl): ValidationErrors | null {
  const raw: string = (control.value ?? '').trim();
  if (!raw) return null;

  const cleaned = raw.replace(/[\s\-]/g, '');

  // L'utilisateur a tapé un numéro complet avec indicatif
  if (cleaned.startsWith('+')) {
    const allowed = ['+221', '+224'];
    if (!allowed.some(c => cleaned.startsWith(c))) return { phoneCountry: true };
    const digits = cleaned.slice(4);
    if (!/^\d+$/.test(digits)) return { phoneFormat: true };
    if (digits.length < 7 || digits.length > 10) return { phoneLength: true };
    return null;
  }

  // Chiffres locaux uniquement
  if (!/^\d+$/.test(cleaned)) return { phoneFormat: true };
  if (cleaned.length < 7 || cleaned.length > 10) return { phoneLength: true };
  return null;
}

function optionalEmailValidator(control: AbstractControl): ValidationErrors | null {
  const v: string = (control.value ?? '').trim();
  if (!v) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : { emailFormat: true };
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
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private toast  = inject(ToastService);

  mounted      = signal(false);
  loading      = signal(false);
  validating   = signal(false);
  showPassword = signal(false);
  errorMessage = signal(false); // boolean : true = afficher le bloc erreur générique
  currentStep  = signal(1);

  inviteMode = signal<'personal' | 'group' | null>(null);
  token      = signal<string | null>(null);

  groupToken      = signal<string | null>(null);
  groupInviteInfo = signal<GroupInviteValidationResponse | null>(null);
  groupTokenError = signal('');

  totalSteps = computed(() => 3);

  countries           = ALLOWED_COUNTRIES;
  selectedCountry     = signal<Country>(ALLOWED_COUNTRIES[0]);
  showCountryDropdown = signal(false);

  form = this.fb.group(
    {
      full_name:       ['', [Validators.required, Validators.minLength(2)]],
      phone_number:    ['', [Validators.required, phoneLocalValidator]],
      email:           ['', [optionalEmailValidator]],
      password:        ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator }
  );

  ngOnInit() {
    const personalToken = this.route.snapshot.queryParamMap.get('token');
    const groupToken    = this.route.snapshot.queryParamMap.get('group');

    if (personalToken) {
      this.inviteMode.set('personal');
      this.token.set(personalToken);
    } else if (groupToken) {
      this.inviteMode.set('group');
      this.groupToken.set(groupToken);
      this.validateGroupToken(groupToken);
    }

    setTimeout(() => this.mounted.set(true), 50);
  }

  private validateGroupToken(token: string) {
    this.validating.set(true);
    this.auth.validateGroupToken(token).subscribe({
      next: (info) => {
        this.groupInviteInfo.set(info);
        if (!info.is_valid) this.groupTokenError.set(info.message);
        this.validating.set(false);
      },
      error: () => {
        this.groupTokenError.set('Impossible de vérifier ce lien. Réessayez.');
        this.validating.set(false);
      },
    });
  }

  // ── Sélecteur pays ───────────────────────────────────────────────────────
  selectCountry(country: Country): void {
    this.selectedCountry.set(country);
    this.showCountryDropdown.set(false);
    this.form.get('phone_number')?.updateValueAndValidity();
  }

  toggleCountryDropdown(event: Event): void {
    event.stopPropagation();
    this.showCountryDropdown.update(v => !v);
  }

  closeDropdown(): void {
    this.showCountryDropdown.set(false);
  }

  buildFullPhone(localNumber: string): string {
    const cleaned = localNumber.trim().replace(/[\s\-]/g, '');
    if (cleaned.startsWith('+')) return cleaned;
    return `${this.selectedCountry().code}${cleaned}`;
  }

  get phonePlaceholder(): string {
    return this.selectedCountry().iso === 'SN' ? '77 123 45 67' : '62 123 45 67';
  }

  // ── Validation ───────────────────────────────────────────────────────────
  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  getPhoneError(): string {
    const ctrl = this.form.get('phone_number');
    if (!ctrl?.errors) return '';
    if (ctrl.errors['required'])     return 'Le numéro de téléphone est obligatoire';
    if (ctrl.errors['phoneCountry']) return 'Sélectionnez Sénégal (+221) ou Guinée (+224)';
    if (ctrl.errors['phoneFormat'])  return 'Chiffres uniquement';
    if (ctrl.errors['phoneLength'])  return `Entrez ${this.selectedCountry().localDigits} chiffres (ex: ${this.phonePlaceholder.replace(/\s/g, '')})`;
    return 'Numéro invalide';
  }

  getEmailError(): string {
    const ctrl = this.form.get('email');
    if (!ctrl?.errors) return '';
    if (ctrl.errors['emailFormat']) return 'Format invalide (ex: nom@domaine.com)';
    return '';
  }

  confirmInvalid(): boolean {
    const ctrl = this.form.get('confirmPassword');
    return !!(ctrl?.touched && this.form.hasError('passwordMismatch'));
  }

  passwordStrength(): number {
    const pwd = this.form.get('password')?.value ?? '';
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8)  score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  }

  strengthLabel(): string {
    return ['', 'Faible', 'Moyen', 'Fort', 'Très fort'][this.passwordStrength()] ?? '';
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  goToStep(n: number) {
    if (n > this.currentStep()) {
      if (this.currentStep() === 1) {
        this.form.get('full_name')?.markAsTouched();
        if (this.form.get('full_name')?.invalid) return;
      }
      if (this.currentStep() === 2) {
        this.form.get('phone_number')?.markAsTouched();
        this.form.get('email')?.markAsTouched();
        if (this.form.get('phone_number')?.invalid) return;
        if (this.form.get('email')?.invalid) return;
      }
    }
    this.currentStep.set(n);
  }

  goToStep2() { this.goToStep(2); }
  goToStep3() { this.goToStep(3); }
  goBack()    { this.currentStep.update(s => s - 1); }

  // ── Soumission ───────────────────────────────────────────────────────────
  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(false);

    const { full_name, phone_number, email, password } = this.form.getRawValue();
    const fullPhone = this.buildFullPhone(phone_number!);

    const commonPayload: Record<string, string> = {
      full_name: full_name!,
      phone_number: fullPhone,
      password: password!,
    };
    if (email?.trim()) commonPayload['email'] = email.trim().toLowerCase();

    if (this.inviteMode() === 'personal') {
      this.auth.register({
        token: this.token()!,
        ...commonPayload,
      } as any).subscribe({
        next: () => {
          this.toast.success('Bienvenue !');
          this.router.navigate(['/']);
        },
        error: () => {
          // Message toujours générique — ne révèle pas ce qui a échoué
          this.errorMessage.set(true);
          this.loading.set(false);
        },
      });

    } else if (this.inviteMode() === 'group') {
      this.auth.registerGroup({
        group_token: this.groupToken()!,
        ...commonPayload,
      } as any).subscribe({
        next: () => {
          this.toast.success("Bienvenue dans l'association !");
          this.router.navigate(['/']);
        },
        error: () => {
          this.errorMessage.set(true);
          this.loading.set(false);
        },
      });
    }
  }
}
