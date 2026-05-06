import {Component, ElementRef, inject, OnInit, signal, ViewChild} from '@angular/core';
import {CommonModule, NgOptimizedImage} from "@angular/common";
import {FormBuilder, ReactiveFormsModule, Validators} from "@angular/forms";
import {RouterLink} from "@angular/router";
import {NavbarComponent} from "../../shared/components/navbar/navbar.component";
import {BottomNavComponent} from "../../shared/components/bottom-nav/bottom-nav.component";
import {ApiService} from "../../core/services/api.service";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {ToastService} from "../../core/services/toast.service";
import {AuthService} from "../../core/auth/auth.service";
import {Member} from "../../shared/models";
import {catchError, of} from "rxjs";
import {environment} from "../../../environments/environment";

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NavbarComponent, BottomNavComponent, NgOptimizedImage],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private fb    = inject(FormBuilder);
  private api   = inject(ApiService);
  private http  = inject(HttpClient);
  private toast = inject(ToastService);
  auth          = inject(AuthService);

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  // ── États ────────────────────────────────────────────────────
  loading         = signal(true);
  savingProfile   = signal(false);
  savingPassword  = signal(false);
  uploadingAvatar = signal(false);
  avatarPreview   = signal<string | null>(null);

  activeTab = signal<'profile' | 'password'>('profile');

  profileError  = signal('');
  passwordError = signal('');

  // ── Formulaires ───────────────────────────────────────────────
  profileForm = this.fb.nonNullable.group({
    full_name:    ['', [Validators.required, Validators.minLength(2)]],
    email:        [''],
    phone_number: ['', [Validators.required]],
  });

  passwordForm = this.fb.nonNullable.group({
    current_password: ['', [Validators.required]],
    new_password:     ['', [Validators.required, Validators.minLength(8)]],
    confirm_password: ['', [Validators.required]],
  });

  showCurrentPwd = signal(false);
  showNewPwd     = signal(false);
  showConfirmPwd = signal(false);

  ngOnInit() {
    this.api.get<Member>('/members/me')
      .pipe(catchError(() => of(null as Member | null)))
      .subscribe(m => {
        if (m) {
          this.profileForm.patchValue({
            full_name:    m.full_name,
            email:        m.email ?? '',
            phone_number: m.phone_number,
          });
        }
        this.loading.set(false);
      });
  }

  // ── Helpers ───────────────────────────────────────────────────
  initials(): string {
    return (this.auth.user()?.full_name ?? '')
      .split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('');
  }

  roleLabel(role: string): string {
    const map: Record<string, string> = {
      admin: 'Administrateur', treasurer: 'Comptable',
      manager: 'Gestionnaire', member: 'Membre',
    };
    return map[role] ?? role;
  }

  isProfileInvalid(field: string): boolean {
    const ctrl = this.profileForm.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  isPasswordInvalid(field: string): boolean {
    const ctrl = this.passwordForm.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  passwordsMatch(): boolean {
    const { new_password, confirm_password } = this.passwordForm.getRawValue();
    return new_password === confirm_password;
  }

  // ── Avatar ────────────────────────────────────────────────────
  triggerFileInput() {
    this.fileInputRef.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Validation taille (5Mo)
    if (file.size > 5 * 1024 * 1024) {
      this.toast.error('La photo ne doit pas dépasser 5 Mo');
      return;
    }

    // Validation format
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.toast.error('Format non supporté. Utilisez JPG, PNG ou WebP.');
      return;
    }

    // Prévisualisation
    const reader = new FileReader();
    reader.onload = (e) => this.avatarPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    this.uploadAvatar(file);
  }

  private uploadAvatar(file: File) {
    this.uploadingAvatar.set(true);
    const formData = new FormData();
    formData.append('file', file);

    const token = this.auth.accessToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.post<{ data: Member }>(`${environment.apiUrl}/members/me/avatar`, formData, { headers })
      .subscribe({
        next: (res) => {
          // Rafraîchir le signal user avec la nouvelle URL
          this.auth.refreshUser();
          this.toast.success('Photo de profil mise à jour !');
          this.uploadingAvatar.set(false);
        },
        error: (err) => {
          this.toast.error(err?.error?.message ?? 'Erreur lors de l\'upload.');
          this.avatarPreview.set(null);
          this.uploadingAvatar.set(false);
        },
      });
  }

  // ── Sauvegarde profil ─────────────────────────────────────────
  saveProfile() {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }

    this.savingProfile.set(true);
    this.profileError.set('');

    const { full_name, email, phone_number } = this.profileForm.getRawValue();
    const body: Record<string, string> = { full_name, phone_number };
    if (email.trim()) body['email'] = email.trim();

    this.api.patch<Member>('/members/me', body).subscribe({
      next: (updated) => {
        this.auth.refreshUser();
        this.toast.success('Profil mis à jour avec succès !');
        this.savingProfile.set(false);
      },
      error: (err) => {
        this.profileError.set(err?.error?.message ?? 'Une erreur est survenue.');
        this.savingProfile.set(false);
      },
    });
  }

  // ── Changement mot de passe ───────────────────────────────────
  savePassword() {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    if (!this.passwordsMatch()) {
      this.passwordError.set('Les mots de passe ne correspondent pas.');
      return;
    }

    this.savingPassword.set(true);
    this.passwordError.set('');

    const { current_password, new_password } = this.passwordForm.getRawValue();

    this.api.put('/auth/password', { current_password, new_password }).subscribe({
      next: () => {
        this.toast.success('Mot de passe modifié. Reconnectez-vous.');
        this.passwordForm.reset();
        this.savingPassword.set(false);
        setTimeout(() => this.auth.logout(), 1500);
      },
      error: (err) => {
        this.passwordError.set(err?.error?.message ?? 'Mot de passe actuel incorrect.');
        this.savingPassword.set(false);
      },
    });
  }
}
