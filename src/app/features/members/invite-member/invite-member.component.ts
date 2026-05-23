import {Component, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from "@angular/forms";
import {CommonModule} from "@angular/common";
import {Router, RouterLink} from "@angular/router";
import {NavbarComponent} from "../../../shared/components/navbar/navbar.component";
import {BottomNavComponent} from "../../../shared/components/bottom-nav/bottom-nav.component";
import {ApiService} from "../../../core/services/api.service";
import {ToastService} from "../../../core/services/toast.service";
import {InviteMemberResponse} from "../../../shared/models";

@Component({
  selector: 'app-invite-member',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NavbarComponent, BottomNavComponent],
  templateUrl: './invite-member.component.html',
  styleUrl: './invite-member.component.scss'
})
export class InviteMemberComponent {
  private fb     = inject(FormBuilder);
  private api    = inject(ApiService);
  private router = inject(Router);
  private toast  = inject(ToastService);

  loading      = signal(false);
  errorMessage = signal('');
  inviteResult = signal<InviteMemberResponse | null>(null);
  linkCopied   = signal(false);

  // ── Formulaire individuel v2 — rôle uniquement ────────────
  // Le membre renseignera lui-même ses informations via le lien
  form = this.fb.nonNullable.group({
    role: ['member', Validators.required],
  });

  roles = [
    { value: 'member',    label: 'Membre',        desc: 'Accès lecture, cotisations' },
    { value: 'manager',   label: 'Gestionnaire',  desc: 'Gestion des projets' },
    { value: 'treasurer', label: 'Comptable',      desc: 'Gestion de la caisse' },
    { value: 'admin',     label: 'Administrateur', desc: 'Accès complet' },
  ];

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.errorMessage.set('');

    const { role } = this.form.getRawValue();

    this.api.post<InviteMemberResponse>('/members/invite', { role }).subscribe({
      next: (res) => {
        this.inviteResult.set(res);
        this.loading.set(false);
        this.toast.success('Lien d\'invitation généré');
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message ?? 'Une erreur est survenue.');
        this.loading.set(false);
      },
    });
  }

  copyLink() {
    const link = this.inviteResult()?.invitation_link;
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 2500);
    });
  }

  newInvitation() {
    this.inviteResult.set(null);
    this.form.reset({ role: 'member' });
  }
}
