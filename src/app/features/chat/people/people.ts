import { Component, inject, OnInit, ChangeDetectionStrategy, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { UsersService } from '../../../core/services/users.service';
import { ChatService } from '../../../core/services/chat.service';
import { SignalRService } from '../../../core/services/signalr.service';
import gsap from 'gsap';

@Component({
  selector: 'app-people',
  standalone: true,
  imports: [FormsModule, Avatar],
  templateUrl: './people.html',
  styleUrl: './people.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class People implements OnInit, AfterViewInit {
  private usersService = inject(UsersService);
  private chatService = inject(ChatService);
  private signalRService = inject(SignalRService);
  private router = inject(Router);

  readonly groupedUsers = this.usersService.groupedUsers;
  readonly loading = this.usersService.loading;
  readonly onlineUsers = this.signalRService.onlineUsers;

  searchQuery = '';

  @ViewChildren('warehouseItem') warehouseItems!: QueryList<ElementRef>;

  ngOnInit(): void {
    this.usersService.loadUsers();
  }

  ngAfterViewInit(): void {
    // Escuchar cambios en la lista para re-animar si es necesario
    this.warehouseItems.changes.subscribe(() => this.animateEntrance());
    this.animateEntrance();
  }

  private animateEntrance(): void {
    const items = this.warehouseItems.toArray().map(el => el.nativeElement);
    if (items.length === 0) return;

    gsap.fromTo(items, 
      { 
        opacity: 0, 
        y: 20, 
        scale: 0.95 
      }, 
      { 
        opacity: 1, 
        y: 0, 
        scale: 1, 
        duration: 0.5, 
        stagger: 0.08, 
        ease: "back.out(1.4)",
        force3D: true,
        clearProps: "transform" // Evita conflictos con futuros toggles
      }
    );
  }

  onSearch(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
    this.usersService.setSearchQuery(this.searchQuery);
  }

  isOnline(userId: string): boolean {
    return this.signalRService.isUserOnline(userId);
  }

  toggleGroup(groupId: string, element: HTMLElement): void {
    const isCollapsed = this.usersService.isGroupCollapsed(groupId);
    this.usersService.toggleGroup(groupId);

    if (isCollapsed) {
      gsap.fromTo(element, 
        { height: 0, opacity: 0, scaleY: 0.9, transformOrigin: "top" },
        { 
          height: "auto", 
          opacity: 1, 
          scaleY: 1, 
          duration: 0.4, 
          ease: "back.out(1.2)",
          force3D: true
        }
      );
    } else {
      gsap.to(element, { 
        height: 0, 
        opacity: 0, 
        scaleY: 0.9,
        duration: 0.3, 
        ease: "power2.in",
        force3D: true
      });
    }
  }

  async startChat(userId: string): Promise<void> {
    const existing = this.chatService.rooms().find(r => 
      r.type === 1 && r.directChatPartnerId === userId
    );
    
    if (existing) {
      this.chatService.setActiveRoom(existing.id);
      this.router.navigate(['/chat', existing.id]);
    } else {
      this.router.navigate(['/chat', 'new', userId]);
    }
  }
}
