import {Component, HostListener, inject, Input, signal} from '@angular/core';
import {AuthService} from "../../../core/auth/auth.service";
import {ApiService} from "../../../core/services/api.service";
import {Router, RouterLink} from "@angular/router";
import {Project} from "../../models";

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    RouterLink
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  @Input() hasUnread = false;

  auth    = inject(AuthService);
  private api    = inject(ApiService);
  private router = inject(Router);

  // ── Recherche projets ──────────────────────────────────────
  searchQuery   = signal('');
  searchResults = signal<Project[]>([]);
  showResults   = signal(false);
  allProjects   = signal<Project[]>([]);

  // ── Dropdown profil ────────────────────────────────────────
  showDropdown = signal(false);

  ngOnInit() {
    this.api.get<Project[]>('/projects')
      .subscribe({ next: p => this.allProjects.set(p), error: () => {} });
  }

  initials(): string {
    return (this.auth.user()?.full_name ?? '')
      .split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('');
  }

  onSearch(query: string) {
    this.searchQuery.set(query);
    if (!query.trim()) {
      this.searchResults.set([]);
      this.showResults.set(false);
      return;
    }
    const q = query.toLowerCase();
    const results = this.allProjects().filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q)
    ).slice(0, 5);
    this.searchResults.set(results);
    this.showResults.set(true);
  }

  selectProject(project: Project) {
    this.searchQuery.set('');
    this.showResults.set(false);
    this.router.navigate(['/projects', project.id]);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.showResults.set(false);
  }

  toggleDropdown() {
    this.showDropdown.update(v => !v);
  }

  logout() {
    this.showDropdown.set(false);
    this.auth.logout();
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: 'Brouillon', in_progress: 'En cours',
      completed: 'Terminé', cancelled: 'Annulé',
    };
    return map[status] ?? status;
  }

  // Ferme dropdown et résultats si clic en dehors
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.navbar__search')) {
      this.showResults.set(false);
    }
    if (!target.closest('.navbar__profile')) {
      this.showDropdown.set(false);
    }
  }
}
