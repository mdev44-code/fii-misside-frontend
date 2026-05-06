import {Injectable, signal} from '@angular/core';
import {ToastMessage, ToastType} from "../../shared/models";

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  private _toasts = signal<ToastMessage[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(message: string, type: ToastType = 'info', duration = 4000): void {
    const toast: ToastMessage = { id: crypto.randomUUID(), type, message, duration };
    this._toasts.update(list => [...list, toast]);
    setTimeout(() => this.dismiss(toast.id), duration);
  }

  success(msg: string): void { this.show(msg, 'success'); }
  error(msg: string): void   { this.show(msg, 'error', 6000); }
  warning(msg: string): void { this.show(msg, 'warning'); }
  info(msg: string): void    { this.show(msg, 'info'); }

  dismiss(id: string): void {
    this._toasts.update(list => list.filter(t => t.id !== id));
  }
}
