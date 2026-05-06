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

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, BottomNavComponent, FcfaPipe],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.scss'
})
export class ProjectListComponent implements OnInit {
  private api = inject(ApiService);
  auth        = inject(AuthService);

  loading  = signal(true);
  projects = signal<Project[]>([]);
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
      cancelled:   all.filter(p => p.status === 'cancelled').length,
    };
  });

  ngOnInit() {
    this.api.get<Project[]>('/projects')
      .pipe(catchError(() => of([] as Project[])))
      .subscribe(list => { this.projects.set(list); this.loading.set(false); });
  }

  progressPercent(p: Project): number {
    if (!p.budget_allocated || p.budget_allocated === 0) return 0;
    return Math.min(100, Math.round((p.budget_spent / p.budget_allocated) * 100));
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
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
