import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'chat',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/chat/layout/chat-layout').then((m) => m.ChatLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/chat/welcome/welcome').then((m) => m.Welcome),
      },
      {
        path: ':roomId',
        loadComponent: () =>
          import('./features/chat/conversation/conversation').then((m) => m.Conversation),
      },
      {
        path: 'new/:userId',
        loadComponent: () =>
          import('./features/chat/conversation/conversation').then((m) => m.Conversation),
      },
    ],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
