import {Component, computed, Input, signal} from '@angular/core';
import {Role} from "../../models";

const ROLE_COLORS: Record<Role, string> = {
  admin:     '#1A5C35',
  treasurer: '#A67C0E',
  manager:   '#1E4D8C',
  member:    '#4A5568',
};

const ROLE_BG: Record<Role, string> = {
  admin:     '#E8F5EE',
  treasurer: '#FDF7E3',
  manager:   '#EFF6FF',
  member:    '#F0F2F5',
};

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [],
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss'
})
export class AvatarComponent {
  @Input() name = '';
  @Input() src: string | null = null;
  @Input() role: Role = 'member';
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';

  imgError = signal(false);

  initials = computed(() =>
    this.name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase() ?? '')
      .join('')
  );

  textColor = computed(() => ROLE_COLORS[this.role] ?? '#4A5568');
  bgColor = computed(() => ROLE_BG[this.role] ?? '#F0F2F5');
  borderColor = computed(() => `${ROLE_COLORS[this.role]}30`);
}
