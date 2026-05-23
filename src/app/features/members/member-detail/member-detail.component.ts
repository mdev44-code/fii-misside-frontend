import {Component, inject, OnInit, signal} from '@angular/core';
import {Member} from "../../../shared/models";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {ApiService} from "../../../core/services/api.service";
import {AuthService} from "../../../core/auth/auth.service";
import {catchError, of} from "rxjs";
import {CommonModule} from "@angular/common";
import {NavbarComponent} from "../../../shared/components/navbar/navbar.component";
import {BottomNavComponent} from "../../../shared/components/bottom-nav/bottom-nav.component";
import {ToastService} from "../../../core/services/toast.service";
import {EditMemberModalComponent} from "../edit-member-modal/edit-member-modal.component";

@Component({
  selector: 'app-member-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, BottomNavComponent, EditMemberModalComponent],
  templateUrl: './member-detail.component.html',
  styleUrl: './member-detail.component.scss'
})
export class MemberDetailComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private api    = inject(ApiService);
  private toast  = inject(ToastService);
  auth           = inject(AuthService);

  loading        = signal(true);
  member         = signal<Member | null>(null);
  error          = signal('');

  // Modal état
  showEditModal    = signal(false);
  showDeleteModal  = signal(false);
  deleting         = signal(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error.set('Identifiant manquant'); this.loading.set(false); return; }

    this.api.get<Member>(`/members/${id}`)
      .pipe(catchError(() => of(null as Member | null)))
      .subscribe(m => {
        this.member.set(m);
        if (!m) this.error.set('Membre introuvable');
        this.loading.set(false);
      });
  }

  // ── Modal édition ─────────────────────────────────────────
  openEditModal()  { this.showEditModal.set(true); }
  closeEditModal() { this.showEditModal.set(false); }

  onMemberUpdated(_updated: Member) {
    this.closeEditModal();
    // Recharge depuis l'API pour garantir les données fraîches
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.get<Member>(`/members/${id}`)
      .pipe(catchError(() => of(this.member())))
      .subscribe(m => { if (m) this.member.set(m); });
  }

  // ── Suppression ───────────────────────────────────────────
  openDeleteModal()  { this.showDeleteModal.set(true); }
  closeDeleteModal() { this.showDeleteModal.set(false); }

  confirmDelete() {
    const m = this.member();
    if (!m || this.deleting()) return;

    this.deleting.set(true);
    this.api.delete<void>(`/members/${m.id}`).subscribe({
      next: () => {
        this.toast.success(`${m.full_name} a été supprimé`);
        this.router.navigate(['/members']);
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Erreur lors de la suppression');
        this.deleting.set(false);
        this.closeDeleteModal();
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────
  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('');
  }

  roleLabel(role: string): string {
    const map: Record<string, string> = {
      admin: 'Administrateur', treasurer: 'Comptable',
      manager: 'Gestionnaire', member: 'Membre',
    };
    return map[role] ?? role;
  }

  joinedLabel(member: { joined_at: string | null; created_at: string }): string {
    const date = member.joined_at ?? member.created_at;
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  isOwnProfile(): boolean {
    return this.auth.user()?.id === this.member()?.id;
  }
}
