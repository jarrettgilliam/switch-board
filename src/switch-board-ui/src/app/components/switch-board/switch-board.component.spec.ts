import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SwitchBoardComponent } from './switch-board.component';

describe('SwitchBoardComponent', () => {
  let component: SwitchBoardComponent;
  let fixture: ComponentFixture<SwitchBoardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SwitchBoardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SwitchBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
