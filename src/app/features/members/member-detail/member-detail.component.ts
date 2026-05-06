import {Component, inject, OnInit, signal} from '@angular/core';
import {Member} from "../../../shared/models";
import {ActivatedRoute, RouterLink} from "@angular/router";
import {ApiService} from "../../../core/services/api.service";
import {AuthService} from "../../../core/auth/auth.service";
import {catchError, of} from "rxjs";
import {CommonModule} from "@angular/common";
import {NavbarComponent} from "../../../shared/components/navbar/navbar.component";
import {BottomNavComponent} from "../../../shared/components/bottom-nav/bottom-nav.component";

@Component({
  selector: 'app-member-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, BottomNavComponent],
  templateUrl: './member-detail.component.html',
  styleUrl: './member-detail.component.scss'
})
export class MemberDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api   = inject(ApiService);
  auth          = inject(AuthService);

  loading = signal(true);
  member  = signal<Member | null>(null);
  error   = signal('');

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

  joinedLabel(date: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  isOwnProfile(): boolean {
    return this.auth.user()?.id === this.member()?.id;
  }
}
