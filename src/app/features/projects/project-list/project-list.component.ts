import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {ApiService} from "../../../core/services/api.service";
import {AuthService} from "../../../core/auth/auth.service";
import {Project, ProjectStatus} from "../../../shared/models";
import {catchError, of} from "rxjs";
import {CommonModule} from "@angular/common";
import {RouterLink} from "@angular/router";
import {NavbarComponent} from "../../../shared/components/navbar/navbar.component";
import {BottomNavComponent} from "../../../shared/components/bottom-nav/bottom-nav.component";
import {FcfaPipe} from "../../../shared/pipes/fcfa.pipe";
import {ToastService} from "../../../core/services/toast.service";
import {Router} from "@angular/router";

// ── Colonnes du board ────────────────────────────────────────────────────────
interface BoardColumn {
  status: ProjectStatus | 'all';
  label: string;
  color: string;       // couleur d'accent de la colonne
  dotColor: string;     // couleur du dot dans le header
}

// ── Transitions autorisées (miroir du backend) ───────────────────────────────
const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft:       ['in_progress', 'cancelled'],
  in_progress: ['completed', 'suspended', 'abandoned'],
  suspended:   ['in_progress', 'abandoned'],
  completed:   [],
  abandoned:   [],
  cancelled:   [],
};

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, BottomNavComponent, FcfaPipe],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.scss'
})
export class ProjectListComponent implements OnInit {
  private api    = inject(ApiService);
  private toast  = inject(ToastService);
  private router = inject(Router);
  auth           = inject(AuthService);

  loading  = signal(true);
  projects = signal<Project[]>([]);

  // ── Vue classique (membres) ────────────────────────────────
  activeFilter = signal<ProjectStatus | 'all'>('all');

  filtered = computed(() => {
    const f = this.activeFilter();
    if (f === 'all') return this.projects();
    return this.projects().filter(p => p.status === f);
  });

  counts = computed(() => {
    const all = this.projects();
    return {
      total:       all.length,
      draft:       all.filter(p => p.status === 'draft').length,
      in_progress: all.filter(p => p.status === 'in_progress').length,
      completed:   all.filter(p => p.status === 'completed').length,
      suspended:   all.filter(p => p.status === 'suspended').length,
      abandoned:   all.filter(p => p.status === 'abandoned').length,
      cancelled:   all.filter(p => p.status === 'cancelled').length,
    };
  });

  // ── Board Scrum (admin/manager) ────────────────────────────
  readonly boardColumns: BoardColumn[] = [
    { status: 'all',         label: 'Tous',       color: '#0d1a10', dotColor: '#0d1a10' },
    { status: 'draft',       label: 'Brouillon',  color: '#6b7d6f', dotColor: '#6b7d6f' },
    { status: 'in_progress', label: 'En cours',   color: '#1e3a8a', dotColor: '#1e3a8a' },
    { status: 'completed',   label: 'Terminé',    color: 'rgb(35,112,68)', dotColor: 'rgb(35,112,68)' },
    { status: 'suspended',   label: 'Suspendu',   color: '#b45309', dotColor: '#b45309' },
    { status: 'abandoned',   label: 'Abandonné',  color: '#7c2d12', dotColor: '#7c2d12' },
    { status: 'cancelled',   label: 'Annulé',     color: '#dc2626', dotColor: '#dc2626' },
  ];

  // Projets par colonne
  projectsByStatus(status: ProjectStatus | 'all'): Project[] {
    if (status === 'all') return this.projects();
    return this.projects().filter(p => p.status === status);
  }

  countByStatus(status: ProjectStatus | 'all'): number {
    return this.projectsByStatus(status).length;
  }

  // ── Drag & Drop state ──────────────────────────────────────
  draggedProject = signal<Project | null>(null);
  dragOverColumn = signal<string | null>(null);
  dragOverInvalid = signal(false);

  // ── Card dropdown state ────────────────────────────────────
  expandedCardId = signal<string | null>(null);

  // ── Menu "Déplacer" (mobile : alternative au drag & drop tactile) ──
  moveMenuId = signal<string | null>(null);

  // ── Delete confirm state ───────────────────────────────────
  deletingId = signal<string | null>(null);
  showDeleteConfirmId = signal<string | null>(null);

  // ── Updating status ────────────────────────────────────────
  updatingId = signal<string | null>(null);

  ngOnInit() {
    this.api.get<Project[]>('/projects')
      .pipe(catchError(() => of([] as Project[])))
      .subscribe(list => { this.projects.set(list); this.loading.set(false); });
  }

  // ── Drag & Drop handlers ──────────────────────────────────
  onDragStart(event: DragEvent, project: Project) {
    this.draggedProject.set(project);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', project.id);
    }
    // Ajouter une classe au body pour un feedback visuel global
    document.body.classList.add('is-dragging');
  }

  onDragEnd() {
    this.draggedProject.set(null);
    this.dragOverColumn.set(null);
    this.dragOverInvalid.set(false);
    document.body.classList.remove('is-dragging');
  }

  onDragOver(event: DragEvent, column: BoardColumn) {
    event.preventDefault();
    const dragged = this.draggedProject();
    if (!dragged) return;

    // La colonne "Tous" n'accepte pas de drop
    if (column.status === 'all') {
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'none';
      this.dragOverColumn.set('all');
      this.dragOverInvalid.set(true);
      return;
    }

    // Même statut = pas de changement
    if (dragged.status === column.status) {
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'none';
      this.dragOverColumn.set(column.status);
      this.dragOverInvalid.set(true);
      return;
    }

    // Vérifier la transition
    const allowed = STATUS_TRANSITIONS[dragged.status] ?? [];
    if (allowed.includes(column.status)) {
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      this.dragOverColumn.set(column.status);
      this.dragOverInvalid.set(false);
    } else {
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'none';
      this.dragOverColumn.set(column.status);
      this.dragOverInvalid.set(true);
    }
  }

  onDragLeave(event: DragEvent, column: BoardColumn) {
    // Ne reset que si on quitte vraiment la colonne (pas un enfant)
    const relatedTarget = event.relatedTarget as HTMLElement;
    const currentTarget = event.currentTarget as HTMLElement;
    if (currentTarget && !currentTarget.contains(relatedTarget)) {
      if (this.dragOverColumn() === column.status) {
        this.dragOverColumn.set(null);
        this.dragOverInvalid.set(false);
      }
    }
  }

  onDrop(event: DragEvent, column: BoardColumn) {
    event.preventDefault();
    const dragged = this.draggedProject();
    if (!dragged || column.status === 'all' || dragged.status === column.status) {
      this.onDragEnd();
      return;
    }
    this.changeStatus(dragged, column.status);
    this.onDragEnd();
  }

  // ── Changement de statut (partagé : drag&drop desktop + menu mobile) ──
  private changeStatus(project: Project, target: ProjectStatus) {
    const allowed = STATUS_TRANSITIONS[project.status] ?? [];
    if (!allowed.includes(target)) {
      const fromLabel = this.statusLabel(project.status);
      const toLabel = this.statusLabel(target);
      this.toast.error(`Transition invalide : "${fromLabel}" → "${toLabel}"`);
      return;
    }

    // Vérifier budget pour passage en in_progress
    if (target === 'in_progress' && !project.budget_allocated) {
      this.toast.error('Impossible de démarrer sans budget défini. Modifiez le projet d\'abord.');
      return;
    }

    // Appel API
    this.updatingId.set(project.id);
    this.api.patch<Project>(`/projects/${project.id}`, { status: target }).subscribe({
      next: (updated) => {
        this.projects.update(list =>
          list.map(p => p.id === updated.id ? updated : p)
        );
        this.toast.success(`"${updated.title}" → ${this.statusLabel(target)}`);
        this.updatingId.set(null);
        this.moveMenuId.set(null);
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Erreur lors de la mise à jour.');
        this.updatingId.set(null);
      },
    });
  }

  // ── Menu "Déplacer" mobile ────────────────────────────────
  toggleMoveMenu(projectId: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.moveMenuId.update(current => current === projectId ? null : projectId);
  }

  moveToStatus(project: Project, target: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.changeStatus(project, target as ProjectStatus);
  }

  // ── Card dropdown toggle ───────────────────────────────────
  toggleCardDetails(projectId: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.expandedCardId.update(current => current === projectId ? null : projectId);
  }

  isCardExpanded(projectId: string): boolean {
    return this.expandedCardId() === projectId;
  }

  // ── Delete project ─────────────────────────────────────────
  confirmDelete(projectId: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.showDeleteConfirmId.set(projectId);
  }

  cancelDelete(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.showDeleteConfirmId.set(null);
  }

  deleteProject(project: Project, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.deletingId.set(project.id);
    this.api.delete(`/projects/${project.id}`).subscribe({
      next: () => {
        this.projects.update(list => list.filter(p => p.id !== project.id));
        this.toast.success(`Projet "${project.title}" supprimé.`);
        this.deletingId.set(null);
        this.showDeleteConfirmId.set(null);
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Erreur lors de la suppression.');
        this.deletingId.set(null);
        this.showDeleteConfirmId.set(null);
      },
    });
  }

  // ── Utilitaires ────────────────────────────────────────────
  progressPercent(p: Project): number {
    if (!p.budget_allocated || p.budget_allocated === 0) return 0;
    return Math.min(100, Math.round((p.budget_spent / p.budget_allocated) * 100));
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Brouillon', in_progress: 'En cours',
      completed: 'Terminé', suspended: 'Suspendu',
      abandoned: 'Abandonné', cancelled: 'Annulé',
    };
    return map[status] ?? status;
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  isTerminal(status: string): boolean {
    return (STATUS_TRANSITIONS[status] ?? []).length === 0;
  }

  allowedTargets(status: string): string[] {
    return STATUS_TRANSITIONS[status] ?? [];
  }
}
