import {Component, inject, OnInit, signal} from '@angular/core';
import {GroupInviteResponse} from "../../../shared/models";
import {FormBuilder, ReactiveFormsModule, Validators} from "@angular/forms";
import {ApiService} from "../../../core/services/api.service";
import {ToastService} from "../../../core/services/toast.service";
import {NavbarComponent} from "../../../shared/components/navbar/navbar.component";
import {BottomNavComponent} from "../../../shared/components/bottom-nav/bottom-nav.component";
import {RouterLink} from "@angular/router";

@Component({
  selector: 'app-group-invite',
  standalone: true,
  imports: [
    NavbarComponent,
    ReactiveFormsModule,
    BottomNavComponent,
    RouterLink
  ],
  templateUrl: './group-invite.component.html',
  styleUrl: './group-invite.component.scss'
})
export class GroupInviteComponent implements OnInit {
  private fb    = inject(FormBuilder);
  private api   = inject(ApiService);
  private toast = inject(ToastService);

  // ── États ─────────────────────────────────────────────────────────────────
  loading        = signal(false);
  loadingList    = signal(true);
  errorMessage   = signal('');
  createdInvite  = signal<GroupInviteResponse | null>(null);
  invites        = signal<GroupInviteResponse[]>([]);
  linkCopied     = signal<string | null>(null);
  showForm       = signal(false);

  // ── Modal de confirmation ──────────────────────────────────────────────────
  confirmModal = signal<{
    visible: boolean;
    invite: GroupInviteResponse | null;
    action: 'deactivate' | 'delete';
  }>({ visible: false, invite: null, action: 'deactivate' });

  // ── Formulaire ────────────────────────────────────────────────────────────
  form = this.fb.nonNullable.group({
    label:            [''],
    default_role:     ['member', Validators.required],
    expires_in_hours: [168, [Validators.required, Validators.min(1), Validators.max(720)]],
    max_uses:         [null as number | null],
  });

  roles = [
    { value: 'member',    label: 'Membre',       desc: 'Accès lecture, cotisations' },
    { value: 'manager',   label: 'Gestionnaire', desc: 'Gestion des projets' },
    { value: 'treasurer', label: 'Comptable',    desc: 'Gestion de la caisse' },
    { value: 'admin',     label: 'Admin',        desc: 'Accès complet' },
  ];

  durations = [
    { hours: 24,  label: '24 heures' },
    { hours: 48,  label: '2 jours' },
    { hours: 72,  label: '3 jours' },
    { hours: 168, label: '7 jours' },
    { hours: 336, label: '14 jours' },
    { hours: 720, label: '30 jours' },
  ];

  // ── Init ──────────────────────────────────────────────────────────────────
  ngOnInit() { this.loadInvites(); }

  loadInvites() {
    this.loadingList.set(true);
    this.api.get<GroupInviteResponse[]>('/members/group-invite').subscribe({
      next: (list) => { this.invites.set(list); this.loadingList.set(false); },
      error: ()    => { this.loadingList.set(false); },
    });
  }

  // ── Création ──────────────────────────────────────────────────────────────
  toggleForm() { this.showForm.update(v => !v); }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading.set(true);
    this.errorMessage.set('');

    const { label, default_role, expires_in_hours, max_uses } = this.form.getRawValue();
    const body: Record<string, unknown> = { default_role, expires_in_hours };
    if (label.trim()) body['label']    = label.trim();
    if (max_uses)     body['max_uses'] = max_uses;

    this.api.post<GroupInviteResponse>('/members/group-invite', body).subscribe({
      next: (res) => {
        this.createdInvite.set(res);
        this.invites.update(list => [res, ...list]);
        this.loading.set(false);
        this.showForm.set(false);
        this.form.reset({ default_role: 'member', expires_in_hours: 168 });
        this.toast.success('Lien d\'invitation groupé créé !');
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message ?? 'Une erreur est survenue.');
        this.loading.set(false);
      },
    });
  }

  // ── Copier ────────────────────────────────────────────────────────────────
  copyLink(invite: GroupInviteResponse) {
    navigator.clipboard.writeText(invite.invitation_link).then(() => {
      this.linkCopied.set(invite.id);
      this.toast.success('Lien copié !');
      setTimeout(() => this.linkCopied.set(null), 2500);
    });
  }

  // ── Modals ────────────────────────────────────────────────────────────────
  openDeactivateModal(invite: GroupInviteResponse) {
    this.confirmModal.set({ visible: true, invite, action: 'deactivate' });
  }

  openDeleteModal(invite: GroupInviteResponse) {
    this.confirmModal.set({ visible: true, invite, action: 'delete' });
  }

  closeModal() {
    this.confirmModal.set({ visible: false, invite: null, action: 'deactivate' });
  }

  confirmAction() {
    const { invite, action } = this.confirmModal();
    if (!invite) return;
    this.closeModal();
    action === 'deactivate' ? this.doDeactivate(invite) : this.doDelete(invite);
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  private doDeactivate(invite: GroupInviteResponse) {
    this.api.delete<GroupInviteResponse>(`/members/group-invite/${invite.id}`).subscribe({
      next: (updated) => {
        this.invites.update(list => list.map(i => i.id === invite.id ? updated : i));
        this.toast.success('Lien désactivé.');
      },
      error: () => this.toast.error('Erreur lors de la désactivation.'),
    });
  }

  private doDelete(invite: GroupInviteResponse) {
    this.api.deleteVoid(`/members/group-invite/${invite.id}/delete`).subscribe({
      next: () => {
        this.invites.update(list => list.filter(i => i.id !== invite.id));
        if (this.createdInvite()?.id === invite.id) this.createdInvite.set(null);
        this.toast.success('Lien supprimé.');
      },
      error: () => this.toast.error('Erreur lors de la suppression.'),
    });
  }

  // ── Helpers modal ─────────────────────────────────────────────────────────
  newInvite() { this.createdInvite.set(null); this.showForm.set(true); }

  get modalTitle(): string {
    return this.confirmModal().action === 'deactivate' ? 'Désactiver ce lien ?' : 'Supprimer ce lien ?';
  }

  get modalMessage(): string {
    const { invite, action } = this.confirmModal();
    const name = invite?.label ? `"${invite.label}"` : 'ce lien';
    return action === 'deactivate'
      ? `Les personnes qui ont reçu ${name} ne pourront plus s'inscrire. Vous pourrez le réactiver plus tard.`
      : `${name} sera définitivement supprimé. Cette action est irréversible.`;
  }

  get modalConfirmLabel(): string {
    return this.confirmModal().action === 'deactivate' ? 'Désactiver' : 'Supprimer';
  }

  get modalIsDanger(): boolean {
    return this.confirmModal().action === 'delete';
  }

  // ── Helpers affichage ─────────────────────────────────────────────────────
  expiresLabel(isoDate: string): string {
    const diff = new Date(isoDate).getTime() - Date.now();
    if (diff <= 0) return 'Expiré';
    const h = Math.floor(diff / 3_600_000);
    return h < 24 ? `Expire dans ${h}h` : `Expire dans ${Math.floor(h / 24)}j`;
  }

  isExpired(isoDate: string): boolean {
    return new Date(isoDate).getTime() < Date.now();
  }

  roleLabel(role: string): string {
    return this.roles.find(r => r.value === role)?.label ?? role;
  }
}
