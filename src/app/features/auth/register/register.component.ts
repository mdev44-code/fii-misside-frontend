import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators} from "@angular/forms";
import {AuthService} from "../../../core/auth/auth.service";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {ToastService} from "../../../core/services/toast.service";
import {NgOptimizedImage} from "@angular/common";
import {GroupInviteValidationResponse} from "../../../shared/models";

/** Validateur : les deux mots de passe doivent être identiques */
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm  = control.get('confirmPassword')?.value;
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
  private fb    = inject(FormBuilder);
  private auth  = inject(AuthService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private toast  = inject(ToastService);

  // ── Signals ───────────────────────────────────────────────────────────────
  mounted      = signal(false);
  loading      = signal(false);
  validating   = signal(false);   // pendant la vérification du token groupe
  showPassword = signal(false);
  errorMessage = signal('');
  currentStep  = signal(1);

  // ── Type d'invitation ─────────────────────────────────────────────────────
  // 'personal' → ?token=XXX  (invitation individuelle, membre pré-créé)
  // 'group'    → ?group=XXX  (lien groupé, la personne remplit tout)
  inviteMode = signal<'personal' | 'group' | null>(null);

  // Token personnel
  token = signal<string | null>(null);

  // Token groupe + infos de validation
  groupToken       = signal<string | null>(null);
  groupInviteInfo  = signal<GroupInviteValidationResponse | null>(null);
  groupTokenError  = signal('');

  // Pour le mode groupe : 3 étapes (identité, contact, sécurité)
  totalSteps = computed(() => this.inviteMode() === 'group' ? 3 : 2);

  // ── Formulaire ────────────────────────────────────────────────────────────
  // Tous les champs sont définis, mais seul certains sont requis selon le mode
  form = this.fb.group(
    {
      full_name:    ['', [Validators.required, Validators.minLength(2)]],
      phone_number: [''],   // requis seulement en mode groupe
      email:        [''],
      password:     ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator }
  );

  // ── Init ──────────────────────────────────────────────────────────────────
  ngOnInit() {
    const personalToken = this.route.snapshot.queryParamMap.get('token');
    const groupToken    = this.route.snapshot.queryParamMap.get('group');

    if (personalToken) {
      this.inviteMode.set('personal');
      this.token.set(personalToken);
    } else if (groupToken) {
      this.inviteMode.set('group');
      this.groupToken.set(groupToken);
      // Ajouter validation du téléphone pour le mode groupe
      this.form.get('phone_number')?.setValidators([Validators.required, Validators.minLength(8)]);
      this.form.get('phone_number')?.updateValueAndValidity();
      // Valider le token immédiatement
      this.validateGroupToken(groupToken);
    }
    // Ni l'un ni l'autre → inviteMode reste null → affichage erreur

    setTimeout(() => this.mounted.set(true), 50);
  }

  // ── Validation du token de groupe ─────────────────────────────────────────
  private validateGroupToken(token: string) {
    this.validating.set(true);
    this.auth.validateGroupToken(token).subscribe({
      next: (info) => {
        this.groupInviteInfo.set(info);
        if (!info.is_valid) {
          this.groupTokenError.set(info.message);
        }
        this.validating.set(false);
      },
      error: () => {
        this.groupTokenError.set(
          'Impossible de vérifier ce lien. Vérifiez votre connexion et réessayez.'
        );
        this.validating.set(false);
      },
    });
  }

  // ── Helpers validation ────────────────────────────────────────────────────
  isInvalid(field: string): boolean {
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
    return ['', 'Faible', 'Moyen', 'Fort', 'Très fort'][this.passwordStrength()] ?? '';
  }

  // ── Navigation entre étapes ───────────────────────────────────────────────
  goToStep(n: number) {
    // Valider l'étape courante avant de passer à la suivante
    if (n > this.currentStep()) {
      if (this.currentStep() === 1) {
        this.form.get('full_name')?.markAsTouched();
        if (this.form.get('full_name')?.invalid) return;
      }
      if (this.currentStep() === 2 && this.inviteMode() === 'group') {
        this.form.get('phone_number')?.markAsTouched();
        if (this.form.get('phone_number')?.invalid) return;
      }
    }
    this.currentStep.set(n);
  }

  goToStep2() { this.goToStep(2); }
  goToStep3() { this.goToStep(3); }
  goBack()    { this.currentStep.update(s => s - 1); }

  // ── Soumission ────────────────────────────────────────────────────────────
  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const { full_name, phone_number, email, password } = this.form.getRawValue();

    if (this.inviteMode() === 'personal') {
      // Invitation personnelle : token + nom + mdp
      this.auth.register({
        token: this.token()!,
        full_name: full_name!,
        password: password!,
      }).subscribe({
        next: () => {
          this.toast.success('Compte créé avec succès. Bienvenue !');
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.errorMessage.set(
            err?.error?.message ?? "Une erreur est survenue. Vérifiez votre lien d'invitation."
          );
          this.loading.set(false);
        },
      });

    } else if (this.inviteMode() === 'group') {
      // Invitation groupée : tout le formulaire
      const payload: Record<string, string> = {
        group_token: this.groupToken()!,
        full_name: full_name!,
        phone_number: phone_number!,
        password: password!,
      };
      if (email?.trim()) payload['email'] = email.trim();

      this.auth.registerGroup(payload as any).subscribe({
        next: () => {
          this.toast.success('Compte créé avec succès. Bienvenue dans l\'association !');
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.errorMessage.set(
            err?.error?.message ?? 'Une erreur est survenue. Réessayez ou contactez l\'administrateur.'
          );
          this.loading.set(false);
        },
      });
    }
  }
}
