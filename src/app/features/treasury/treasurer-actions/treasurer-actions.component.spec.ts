import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreasurerActionsComponent } from './treasurer-actions.component';

describe('TreasurerActionsComponent', () => {
  let component: TreasurerActionsComponent;
  let fixture: ComponentFixture<TreasurerActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreasurerActionsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TreasurerActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
