import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiService } from '../../../core/services/api.service';

export interface BroadcastNotification {
  id: string;
  type: string;
  content: string;
  triggered_by: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit {
  auth    = inject(AuthService);
  private api = inject(ApiService);

  // ── Notifications ──────────────────────────────────────────
  showNotifPanel  = signal(false);
  notifications   = signal<BroadcastNotification[]>([]);
  unreadCount     = signal(0);
  loadingNotifs   = signal(false);

  // ── Dropdown profil ────────────────────────────────────────
  showDropdown = signal(false);

  ngOnInit() {
    this.loadUnreadCount();
    // Polling léger : recharge le count toutes les 60s
    setInterval(() => this.loadUnreadCount(), 60_000);
  }

  initials(): string {
    return (this.auth.user()?.full_name ?? '')
      .split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('');
  }

  // ── Notifications ──────────────────────────────────────────

  loadUnreadCount() {
    this.api.get<{ unread_count: number }>('/notifications/count').subscribe({
      next: res => this.unreadCount.set(res.unread_count),
      error: () => {},
    });
  }

  loadNotifications() {
    this.loadingNotifs.set(true);
    this.api.get<BroadcastNotification[]>('/notifications').subscribe({
      next: notifs => {
        this.notifications.set(notifs);
        this.loadingNotifs.set(false);
      },
      error: () => this.loadingNotifs.set(false),
    });
  }

  toggleNotifPanel(event: Event) {
    event.stopPropagation();
    const willOpen = !this.showNotifPanel();
    this.showNotifPanel.set(willOpen);
    this.showDropdown.set(false);

    if (willOpen) {
      this.loadNotifications();
      // Marquer tout comme lu et réinitialiser le badge
      if (this.unreadCount() > 0) {
        this.api.patch('/notifications/read-all', {}).subscribe({
          next: () => this.unreadCount.set(0),
          error: () => {},
        });
      }
    }
  }

  markAsRead(notif: BroadcastNotification, event: Event) {
    event.stopPropagation();
    if (notif.is_read) return;

    this.api.patch(`/notifications/${notif.id}/read`, {}).subscribe({
      next: () => {
        this.notifications.update(list =>
          list.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
        );
      },
      error: () => {},
    });
  }

  // ── Dropdown profil ────────────────────────────────────────

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.showDropdown.update(v => !v);
    this.showNotifPanel.set(false);
  }

  logout() {
    this.showDropdown.set(false);
    this.auth.logout();
  }

  // ── Helpers ────────────────────────────────────────────────

  notifIcon(type: string): string {
    const icons: Record<string, string> = {
      contribution_reminder:  'reminder',
      contribution_received:  'received',
      expense_recorded:       'expense',
      new_project:            'project',
      member_joined:          'member',
      general:                'general',
    };
    return icons[type] ?? 'general';
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1)  return "À l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)   return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1)   return 'hier';
    return `il y a ${days}j`;
  }

  groupByDay(notifs: BroadcastNotification[]): { label: string; items: BroadcastNotification[] }[] {
    const groups: Map<string, BroadcastNotification[]> = new Map();
    const today     = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

    for (const n of notifs) {
      const d = new Date(n.created_at); d.setHours(0,0,0,0);
      let label: string;
      if (d.getTime() === today.getTime())     label = "Aujourd'hui";
      else if (d.getTime() === yesterday.getTime()) label = 'Hier';
      else label = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(n);
    }

    return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.navbar__notif-wrap')) this.showNotifPanel.set(false);
    if (!target.closest('.navbar__profile'))    this.showDropdown.set(false);
  }
}
