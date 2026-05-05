import {  Component, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, HostListener, Inject, PLATFORM_ID , ChangeDetectionStrategy, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',

  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login implements AfterViewInit, OnDestroy {
  @ViewChild('networkCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private themeService = inject(ThemeService);
  claveUsuario = '';
  password = '';
  passShowing = false;
  loading = signal(false);
  error = signal('');
  logoPath = 'assets/logochatpmm.png';

  // Particle System State
  private ctx!: CanvasRenderingContext2D | null;
  private particles: any[] = [];
  private animationFrameId: number = 0;
  private mouse = { x: -9999, y: -9999 };
  private isBrowser: boolean;

  // Layer Configs (Matching the provided design)
  private readonly LAYER_DEFS = [
    { frac: 0.45, minSz: 1.2, maxSz: 2.6, minSpd: 0.25, maxSpd: 0.65, alpha: 0.85, connDist: 135, parallax: 0.022, mouseLines: true  },
    { frac: 0.35, minSz: 0.6, maxSz: 1.5, minSpd: 0.10, maxSpd: 0.30, alpha: 0.45, connDist: 100, parallax: 0.010, mouseLines: false },
    { frac: 0.20, minSz: 2.8, maxSz: 4.5, minSpd: 0.04, maxSpd: 0.12, alpha: 0.18, connDist:  80, parallax: 0.004, mouseLines: false },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      setTimeout(() => this.initCanvas(), 100);
    }
  }

  ngOnDestroy() {
    if (this.isBrowser && this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.isBrowser) {
      window.removeEventListener('resize', this.resizeCanvas);
    }
  }

  onLogoError() {
    console.error('No se pudo cargar el logo desde:', this.logoPath);
  }

  togglePass() {
    this.passShowing = !this.passShowing;
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;
  }

  @HostListener('window:mouseout')
  onMouseOut() {
    this.mouse.x = -9999;
    this.mouse.y = -9999;
  }

  private initCanvas() {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    window.addEventListener('resize', this.resizeCanvas);
    this.resizeCanvas();
    this.animate();
  }

  private resizeCanvas = () => {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    this.spawnParticles();
  }

  private spawnParticles() {
    this.particles = [];
    const canvas = this.canvasRef.nativeElement;
    const W = canvas.width;
    const H = canvas.height;
    
    // Base amount of particles based on screen size
    const baseCount = Math.max(60, Math.floor((W * H) / 9000));
    
    this.LAYER_DEFS.forEach((l, li) => {
      const n = Math.round(baseCount * l.frac);
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = l.minSpd + Math.random() * (l.maxSpd - l.minSpd);
        
        this.particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size: l.minSz + Math.random() * (l.maxSz - l.minSz),
          alpha: l.alpha * (0.5 + Math.random() * 0.5),
          layer: li,
          connDist: l.connDist,
          parallax: l.parallax,
          mouseLines: l.mouseLines,
        });
      }
    });
  }

  private animate() {
    const canvas = this.canvasRef.nativeElement;
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    const W = canvas.width;
    const H = canvas.height;

    // Get theme colors
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryRgb = computedStyle.getPropertyValue('--primary-rgb').trim() || '59, 130, 246';
    const rgbParts = primaryRgb.split(',').map(p => p.trim());
    const r = rgbParts[0], g = rgbParts[1], b = rgbParts[2];

    const cx = W / 2, cy = H / 2;
    const mox = (this.mouse.x - cx) * 0.8;
    const moy = (this.mouse.y - cy) * 0.8;

    this.particles.forEach((p, i) => {
      // Movement
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;

      // Mouse repulsion
      const rdx = this.mouse.x - p.x;
      const rdy = this.mouse.y - p.y;
      const rd = Math.sqrt(rdx * rdx + rdy * rdy);
      
      if (rd < 130 && rd > 0) {
        const force = (130 - rd) / 130;
        p.x -= (rdx / rd) * force * 2.5;
        p.y -= (rdy / rd) * force * 2.5;
      }

      // Parallax position
      const rx = p.x + mox * p.parallax;
      const ry = p.y + moy * p.parallax;

      // Render Glow for larger particles
      if (p.size > 2.5) {
        this.ctx!.beginPath();
        this.ctx!.arc(rx, ry, p.size * 3.5, 0, Math.PI * 2);
        this.ctx!.fillStyle = `rgba(${r},${g},${b},${p.alpha * 0.06})`;
        this.ctx!.fill();
      }

      // Render Core Dot
      this.ctx!.beginPath();
      this.ctx!.arc(rx, ry, p.size, 0, Math.PI * 2);
      this.ctx!.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
      this.ctx!.fill();

      // Connections (within same layer)
      for (let j = i + 1; j < this.particles.length; j++) {
        const q = this.particles[j];
        if (q.layer !== p.layer) continue;

        const qrx = q.x + mox * q.parallax;
        const qry = q.y + moy * q.parallax;
        const dx = rx - qrx;
        const dy = ry - qry;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < p.connDist) {
          const t = 1 - dist / p.connDist;
          this.ctx!.beginPath();
          this.ctx!.strokeStyle = `rgba(${r},${g},${b},${t * 0.28 * p.alpha})`;
          this.ctx!.lineWidth = 0.75;
          this.ctx!.moveTo(rx, ry);
          this.ctx!.lineTo(qrx, qry);
          this.ctx!.stroke();
        }
      }

      // Front layer mouse lines
      if (p.mouseLines && rd < 170) {
        const t = 1 - rd / 170;
        this.ctx!.beginPath();
        this.ctx!.strokeStyle = `rgba(${r},${g},${b},${t * 0.45})`;
        this.ctx!.lineWidth = 1.2;
        this.ctx!.moveTo(rx, ry);
        this.ctx!.lineTo(this.mouse.x, this.mouse.y);
        this.ctx!.stroke();
      }
    });

    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }

  async onSubmit(): Promise<void> {
    if (!this.claveUsuario.trim() || !this.password.trim()) {
      this.error.set('Ingresa tu clave de usuario y contraseña.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      await this.authService.login({
        claveUsuario: this.claveUsuario.trim(),
        password: this.password,
      });
      this.router.navigate(['/chat']);
    } catch (err: any) {
      const message = err?.error?.message || err?.message || 'Error al iniciar sesión.';
      this.error.set(message);
    } finally {
      this.loading.set(false);
    }
  }
}
