import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {ApiService} from "../../../core/services/api.service";
import {Member} from "../../../shared/models";
import {catchError, of} from "rxjs";
import {NavbarComponent} from "../../../shared/components/navbar/navbar.component";
import {BottomNavComponent} from "../../../shared/components/bottom-nav/bottom-nav.component";
import {AuthService} from "../../../core/auth/auth.service";
import {RouterLink} from "@angular/router";

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [
    NavbarComponent,
    BottomNavComponent,
    RouterLink
  ],
  templateUrl: './member-list.component.html',
  styleUrl: './member-list.component.scss'
})
export class MemberListComponent implements OnInit {
  private api = inject(ApiService);
  auth        = inject(AuthService);

  loading = signal(true);
  members = signal<Member[]>([]);
  search  = signal('');

  filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.members();
    return this.members().filter(m =>
      m.full_name.toLowerCase().includes(q) ||
      m.phone_number.includes(q) ||
      (m.email ?? '').toLowerCase().includes(q)
    );
  });

  counts = computed(() => {
    const all = this.members();
    return {
      total:     all.length,
      admin:     all.filter(m => m.role === 'admin').length,
      treasurer: all.filter(m => m.role === 'treasurer').length,
      manager:   all.filter(m => m.role === 'manager').length,
      member:    all.filter(m => m.role === 'member').length,
    };
  });

  ngOnInit() {
    this.api.get<Member[]>('/members')
      .pipe(catchError(() => of([] as Member[])))
      .subscribe(list => {
        this.members.set(list);
        this.loading.set(false);
      });
  }

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

  roleColor(role: string): string {
    return role;
  }
}
