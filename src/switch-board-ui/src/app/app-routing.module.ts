import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SwitchBoardComponent } from "./components/switch-board/switch-board.component";

const routes: Routes = [
  { path: '', redirectTo: '/switch-board', pathMatch: 'full' },
  { path: 'switch-board', component: SwitchBoardComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
