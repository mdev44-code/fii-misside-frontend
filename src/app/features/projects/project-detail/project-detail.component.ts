import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {CommonModule} from "@angular/common";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {NavbarComponent} from "../../../shared/components/navbar/navbar.component";
import {BottomNavComponent} from "../../../shared/components/bottom-nav/bottom-nav.component";
import {FcfaPipe} from "../../../shared/pipes/fcfa.pipe";
import {ApiService} from "../../../core/services/api.service";
import {ToastService} from "../../../core/services/toast.service";
import {AuthService} from "../../../core/auth/auth.service";
import {Project} from "../../../shared/models";
import {catchError, of} from "rxjs";

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, BottomNavComponent, FcfaPipe],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss'
})
export class ProjectDetailComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private api    = inject(ApiService);
  private router = inject(Router);
  private toast  = inject(ToastService);
  auth           = inject(AuthService);

  loading        = signal(true);
  project        = signal<Project | null>(null);
  updatingStatus = signal(false);
  showDeleteConfirm = signal(false);
  deleting       = signal(false);

  progressPercent = computed(() => {
    const p = this.project();
    if (!p?.budget_allocated || p.budget_allocated === 0) return 0;
    return Math.min(100, Math.round((p.budget_spent / p.budget_allocated) * 100));
  });

  // Statuts disponibles depuis le statut actuel
  availableStatuses = computed((): { value: string; label: string; disabled: boolean }[] => {
    const p = this.project();
    if (!p) return [];
    const allStatuses = [
      { value: 'draft',       label: 'Brouillon',  disabled: p.status === 'draft' },
      { value: 'in_progress', label: 'En cours',   disabled: p.status === 'in_progress' || (!p.budget_allocated && p.status === 'draft') },
      { value: 'completed',   label: 'Terminé',    disabled: p.status === 'completed' },
      { value: 'cancelled',   label: 'Annulé',     disabled: p.status === 'cancelled' },
    ];
    return allStatuses.filter(s => s.value !== p.status);
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.get<Project>(`/projects/${id}`)
      .pipe(catchError(() => of(null as Project | null)))
      .subscribe(p => { this.project.set(p); this.loading.set(false); });
  }

  changeStatus(newStatus: string) {
    const p = this.project();
    if (!p) return;

    if (newStatus === 'in_progress' && !p.budget_allocated) {
      this.toast.error('Impossible de démarrer sans budget défini. Modifiez le projet d\'abord.');
      return;
    }

    this.updatingStatus.set(true);
    this.api.patch<Project>(`/projects/${p.id}`, { status: newStatus }).subscribe({
      next: (updated) => {
        this.project.set(updated);
        this.toast.success(`Statut mis à jour : ${this.statusLabel(newStatus)}`);
        this.updatingStatus.set(false);
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Erreur lors de la mise à jour.');
        this.updatingStatus.set(false);
      },
    });
  }

  deleteProject() {
    const p = this.project();
    if (!p) return;
    this.deleting.set(true);
    this.api.delete(`/projects/${p.id}`).subscribe({
      next: () => {
        this.toast.success('Projet supprimé.');
        this.router.navigate(['/projects']);
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Erreur lors de la suppression.');
        this.deleting.set(false);
        this.showDeleteConfirm.set(false);
      },
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Brouillon', in_progress: 'En cours',
      completed: 'Terminé', cancelled: 'Annulé',
    };
    return map[status] ?? status;
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
