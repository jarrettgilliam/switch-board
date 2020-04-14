import { TestBed } from '@angular/core/testing';

import { SwitchBoardService } from './switch-board.service';

describe('SwitchBoardService', () => {
  let service: SwitchBoardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SwitchBoardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
