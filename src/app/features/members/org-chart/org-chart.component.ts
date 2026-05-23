import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {CommonModule} from "@angular/common";
import {RouterLink} from "@angular/router";
import {NavbarComponent} from "../../../shared/components/navbar/navbar.component";
import {BottomNavComponent} from "../../../shared/components/bottom-nav/bottom-nav.component";
import {ApiService} from "../../../core/services/api.service";
import {Member, OrgChart, OrgChartMember} from "../../../shared/models";
import {catchError, forkJoin, of} from "rxjs";
import {ToastService} from "../../../core/services/toast.service";
import {AuthService} from "../../../core/auth/auth.service";
import {FormsModule} from "@angular/forms";

// ── Interfaces locales (réponse API /postes) ─────────────────────────────────

interface PosteMember {
  id: string;
  full_name: string;
  phone_number: string;
  avatar_url: string | null;
}

interface Poste {
  id: string;
  title: string;
  member: PosteMember | null;
  is_vacant: boolean;
  created_at: string;
  updated_at: string;
}

interface OrgChartPostes {
  postes: Poste[];
  total: number;
  occupied: number;
  vacant: number;
}

@Component({
  selector: 'app-org-chart',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, NavbarComponent, BottomNavComponent],
  templateUrl: './org-chart.component.html',
  styleUrl: './org-chart.component.scss'
})
export class OrgChartComponent implements OnInit {
  private api   = inject(ApiService);
  private toast = inject(ToastService);
  auth          = inject(AuthService);

  // ── État principal ──────────────────────────────────────────
  loading  = signal(true);
  data     = signal<OrgChartPostes | null>(null);
  members  = signal<Member[]>([]);

  // ── État modales ────────────────────────────────────────────
  showCreateModal  = signal(false);
  showAssignModal  = signal(false);
  showDeleteModal  = signal(false);
  actionLoading    = signal(false);

  // Formulaire création
  newTitle = signal('');

  // Formulaire attribution
  selectedPoste     = signal<Poste | null>(null);
  selectedMemberId  = signal('');

  // Poste à supprimer
  posteToDelete = signal<Poste | null>(null);

  // Custom dropdown
  dropdownOpen = signal(false);

  // ── Computed ────────────────────────────────────────────────
  postes   = computed(() => this.data()?.postes ?? []);
  total    = computed(() => this.data()?.total ?? 0);
  occupied = computed(() => this.data()?.occupied ?? 0);
  vacant   = computed(() => this.data()?.vacant ?? 0);

  /** Membres actifs qui n'occupent pas déjà un poste */
  availableMembers = computed(() => {
    const assignedIds = new Set(
      this.postes()
        .filter(p => p.member && p.id !== this.selectedPoste()?.id)
        .map(p => p.member!.id)
    );
    return this.members().filter(m => !assignedIds.has(m.id));
  });

  /** Label affiché dans le custom dropdown */
  selectedMemberLabel = computed(() => {
    const id = this.selectedMemberId();
    if (!id) return '— Aucun (libérer le poste) —';
    // Chercher dans les membres disponibles
    const m = this.members().find(m => m.id === id);
    if (m) return `${m.full_name} · ${m.phone_number}`;
    // Titulaire actuel (pas dans availableMembers)
    const poste = this.selectedPoste();
    if (poste?.member?.id === id) return `${poste.member.full_name} · ${poste.member.phone_number}`;
    return '— Aucun (libérer le poste) —';
  });

  ngOnInit() {
    this.loadData();
  }

  // ── Chargement ──────────────────────────────────────────────

  private loadData() {
    this.loading.set(true);

    if (this.auth.isAdmin()) {
      // Admin : charge postes + membres pour pouvoir assigner
      forkJoin({
        chart: this.api.get<OrgChartPostes>('/postes').pipe(catchError(() => of(null))),
        members: this.api.get<Member[]>('/members').pipe(catchError(() => of([] as Member[]))),
      }).subscribe(({chart, members}) => {
        this.data.set(chart);
        this.members.set(members ?? []);
        this.loading.set(false);
      });
    } else {
      this.api.get<OrgChartPostes>('/postes')
        .pipe(catchError(() => of(null as OrgChartPostes | null)))
        .subscribe(chart => {
          this.data.set(chart);
          this.loading.set(false);
        });
    }
  }

  // ── Helpers ─────────────────────────────────────────────────

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('');
  }

  // ── Créer un poste ──────────────────────────────────────────

  openCreate() {
    this.newTitle.set('');
    this.showCreateModal.set(true);
  }

  closeCreate() {
    this.showCreateModal.set(false);
  }

  submitCreate() {
    const title = this.newTitle().trim();
    if (title.length < 2) return;

    this.actionLoading.set(true);
    this.api.post<Poste>('/postes', {title}).subscribe({
      next: () => {
        this.toast.success(`Poste "${title}" créé`);
        this.closeCreate();
        this.actionLoading.set(false);
        this.loadData();
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Erreur lors de la création');
        this.actionLoading.set(false);
      },
    });
  }

  // ── Custom dropdown ────────────────────────────────────────

  toggleDropdown() {
    this.dropdownOpen.update(v => !v);
  }

  selectMember(id: string) {
    this.selectedMemberId.set(id);
    this.dropdownOpen.set(false);
  }

  // ── Assigner / libérer un poste ─────────────────────────────

  openAssign(poste: Poste) {
    this.selectedPoste.set(poste);
    this.selectedMemberId.set(poste.member?.id ?? '');
    this.dropdownOpen.set(false);
    this.showAssignModal.set(true);
  }

  closeAssign() {
    this.showAssignModal.set(false);
    this.selectedPoste.set(null);
    this.dropdownOpen.set(false);
  }

  submitAssign() {
    const poste = this.selectedPoste();
    if (!poste) return;

    const memberId = this.selectedMemberId() || null;
    this.actionLoading.set(true);

    this.api.patch<Poste>(`/postes/${poste.id}/assign`, {member_id: memberId}).subscribe({
      next: () => {
        this.toast.success(memberId ? 'Poste attribué' : 'Poste libéré');
        this.closeAssign();
        this.actionLoading.set(false);
        this.loadData();
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Erreur lors de l\'attribution');
        this.actionLoading.set(false);
      },
    });
  }

  // ── Supprimer un poste ──────────────────────────────────────

  openDelete(poste: Poste) {
    this.posteToDelete.set(poste);
    this.showDeleteModal.set(true);
  }

  closeDelete() {
    this.showDeleteModal.set(false);
    this.posteToDelete.set(null);
  }

  confirmDelete() {
    const poste = this.posteToDelete();
    if (!poste) return;

    this.actionLoading.set(true);
    this.api.delete(`/postes/${poste.id}`).subscribe({
      next: () => {
        this.toast.success(`Poste "${poste.title}" supprimé`);
        this.closeDelete();
        this.actionLoading.set(false);
        this.loadData();
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Erreur lors de la suppression');
        this.actionLoading.set(false);
      },
    });
  }
}
