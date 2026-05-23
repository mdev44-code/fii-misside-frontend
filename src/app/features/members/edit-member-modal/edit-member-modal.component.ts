import {Component, EventEmitter, inject, Input, OnChanges, Output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Member, MemberStatus, Role} from "../../../shared/models";
import {ApiService} from "../../../core/services/api.service";
import {ToastService} from "../../../core/services/toast.service";

@Component({
  selector: 'app-edit-member-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-member-modal.component.html',
  styleUrl: './edit-member-modal.component.scss'
})
export class EditMemberModalComponent implements OnChanges {
  private api   = inject(ApiService);
  private toast = inject(ToastService);

  @Input()  member!: Member;
  @Output() closed  = new EventEmitter<void>();
  @Output() updated = new EventEmitter<Member>();

  selectedRole   = signal<Role>('member');
  selectedStatus = signal<MemberStatus>('active');
  saving         = signal(false);

  roles: { value: Role; label: string }[] = [
    { value: 'admin',     label: 'Administrateur' },
    { value: 'treasurer', label: 'Comptable' },
    { value: 'manager',   label: 'Gestionnaire' },
    { value: 'member',    label: 'Membre' },
  ];

  statuses: { value: MemberStatus; label: string; color: string }[] = [
    { value: 'active',    label: 'Actif',    color: 'green' },
    { value: 'inactive',  label: 'Inactif',  color: 'grey' },
    { value: 'suspended', label: 'Suspendu', color: 'red' },
  ];

  ngOnChanges() {
    if (this.member) {
      this.selectedRole.set(this.member.role);
      this.selectedStatus.set(this.member.status);
    }
  }

  close() {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close();
    }
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('');
  }

  get roleChanged(): boolean {
    return this.selectedRole() !== this.member.role;
  }

  get statusChanged(): boolean {
    return this.selectedStatus() !== this.member.status;
  }

  get hasChanges(): boolean {
    return this.roleChanged || this.statusChanged;
  }

  async save() {
    if (!this.hasChanges || this.saving()) return;
    this.saving.set(true);

    const calls: Promise<void>[] = [];

    if (this.roleChanged) {
      calls.push(
        new Promise((resolve, reject) => {
          this.api.patch<Member>(`/members/${this.member.id}/role`, { role: this.selectedRole() })
            .subscribe({ next: () => resolve(), error: (e) => reject(e) });
        })
      );
    }

    if (this.statusChanged) {
      calls.push(
        new Promise((resolve, reject) => {
          this.api.patch<Member>(`/members/${this.member.id}/status`, { status: this.selectedStatus() })
            .subscribe({ next: () => resolve(), error: (e) => reject(e) });
        })
      );
    }

    try {
      await Promise.all(calls);
      this.api.get<Member>(`/members/${this.member.id}`).subscribe(updated => {
        this.toast.success('Modifications enregistrées');
        this.updated.emit(updated);
        this.saving.set(false);
      });
    } catch (err: any) {
      this.toast.error(err?.error?.message ?? 'Une erreur est survenue');
      this.saving.set(false);
    }
  }
}
