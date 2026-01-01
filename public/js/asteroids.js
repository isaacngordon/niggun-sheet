/**
 * ASTEROIDS - Shoot the Page Elements!
 * A fun Easter egg game where you fly a spaceship and shoot DOM elements
 * 
 * Activate by calling: window.asteroids()
 * Or use the Konami Code: ↑↑↓↓←→←→BA
 */

(function() {
    'use strict';
    
    const ASTEROIDS = {
        // Game config
        SHIP_SIZE: 20,
        BULLET_SPEED: 15,
        SHIP_SPEED: 8,
        ROTATION_SPEED: 0.15,
        FRICTION: 0.98,
        BRAND_COLOR: '#f2cb05',
        
        // State
        canvas: null,
        ctx: null,
        ship: null,
        bullets: [],
        particles: [],
        enemies: [],
        score: 0,
        isRunning: false,
        animationId: null,
        keys: {},
        
        init: function() {
            if (window.ASTEROIDS_ACTIVE) return;
            window.ASTEROIDS_ACTIVE = true;
            
            this.createCanvas();
            this.createShip();
            this.findEnemies();
            this.createHUD();
            this.bindEvents();
            this.isRunning = true;
            this.gameLoop();
            
            // Periodically refresh enemies to find newly exposed leaf elements
            this.refreshInterval = setInterval(() => {
                if (this.isRunning) {
                    this.refreshEnemies();
                }
            }, 2000);
            
            console.log('🚀 ASTEROIDS activated! Use arrow keys to move, SPACE to shoot, ESC to exit');
        },
        
        refreshEnemies: function() {
            // Keep track of elements we already have
            const existingElements = new Set(this.enemies.map(e => e.element));
            
            // Find new leaf elements that weren't targets before
            const allElements = document.querySelectorAll('*');
            
            allElements.forEach(el => {
                // Skip if already tracked
                if (existingElements.has(el)) return;
                
                // Skip our own elements
                if (el.id && el.id.startsWith('asteroids')) return;
                if (el.classList && el.classList.contains('asteroids-element')) return;
                
                // Skip script, style, meta tags
                const tagName = el.tagName.toLowerCase();
                if (['script', 'style', 'meta', 'link', 'head', 'html', 'noscript', 'br', 'hr'].includes(tagName)) return;
                
                // Check if this is now a "leaf" element (no visible element children)
                const hasElementChildren = Array.from(el.children).some(child => {
                    const childTag = child.tagName.toLowerCase();
                    if (['script', 'style', 'meta', 'link', 'br', 'hr'].includes(childTag)) return false;
                    const childStyle = window.getComputedStyle(child);
                    if (childStyle.display === 'none' || childStyle.visibility === 'hidden' || childStyle.opacity === '0') return false;
                    const childRect = child.getBoundingClientRect();
                    if (childRect.width < 5 || childRect.height < 5) return false;
                    return true;
                });
                
                // Only target leaf elements
                if (hasElementChildren) return;
                
                const rect = el.getBoundingClientRect();
                
                // Skip elements that are too small or off-screen
                if (rect.width < 10 || rect.height < 5) return;
                if (rect.bottom < 0 || rect.top > window.innerHeight) return;
                if (rect.right < 0 || rect.left > window.innerWidth) return;
                
                // Check if element is visible
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
                
                // Calculate center and radius
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const radius = Math.min(Math.max(rect.width, rect.height) / 2, 100);
                
                // Add health based on size
                const health = Math.max(1, Math.ceil(radius / 50));
                
                this.enemies.push({
                    element: el,
                    x: cx,
                    y: cy,
                    width: rect.width,
                    height: rect.height,
                    radius: radius,
                    health: health,
                    maxHealth: health,
                    hit: false,
                    destroyed: false
                });
            });
        },
        
        createCanvas: function() {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'asteroids-canvas';
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.canvas.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 999999;
                pointer-events: none;
            `;
            document.body.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
        },
        
        createShip: function() {
            this.ship = {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                vx: 0,
                vy: 0,
                angle: -Math.PI / 2, // Pointing up
                size: this.SHIP_SIZE
            };
        },
        
        findEnemies: function() {
            this.enemies = [];
            
            // Find "leaf" elements - elements with no child elements (only text content)
            // This way containers become targets only after their children are destroyed
            const allElements = document.querySelectorAll('*');
            
            allElements.forEach(el => {
                // Skip our own elements
                if (el.id && el.id.startsWith('asteroids')) return;
                if (el.classList && el.classList.contains('asteroids-element')) return;
                
                // Skip script, style, meta tags
                const tagName = el.tagName.toLowerCase();
                if (['script', 'style', 'meta', 'link', 'head', 'html', 'noscript', 'br', 'hr'].includes(tagName)) return;
                
                // Check if this is a "leaf" element (no element children, only text or empty)
                const hasElementChildren = Array.from(el.children).some(child => {
                    const childTag = child.tagName.toLowerCase();
                    // Ignore certain invisible children
                    if (['script', 'style', 'meta', 'link', 'br', 'hr'].includes(childTag)) return false;
                    // Check if child is visible
                    const childStyle = window.getComputedStyle(child);
                    if (childStyle.display === 'none' || childStyle.visibility === 'hidden') return false;
                    const childRect = child.getBoundingClientRect();
                    if (childRect.width < 5 || childRect.height < 5) return false;
                    return true;
                });
                
                // Only target leaf elements (no visible element children)
                if (hasElementChildren) return;
                
                const rect = el.getBoundingClientRect();
                
                // Skip elements that are too small or off-screen
                if (rect.width < 10 || rect.height < 5) return;
                if (rect.bottom < 0 || rect.top > window.innerHeight) return;
                if (rect.right < 0 || rect.left > window.innerWidth) return;
                
                // Check if element is visible
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
                
                // Calculate center and radius
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const radius = Math.min(Math.max(rect.width, rect.height) / 2, 100);
                
                // Add health based on size
                const health = Math.max(1, Math.ceil(radius / 50));
                
                this.enemies.push({
                    element: el,
                    x: cx,
                    y: cy,
                    width: rect.width,
                    height: rect.height,
                    radius: radius,
                    health: health,
                    maxHealth: health,
                    hit: false,
                    destroyed: false
                });
            });
            
            // Limit to reasonable number
            if (this.enemies.length > 200) {
                this.enemies = this.enemies.slice(0, 200);
            }
        },
        
        createHUD: function() {
            const hud = document.createElement('div');
            hud.id = 'asteroids-hud';
            hud.className = 'asteroids-element';
            hud.style.cssText = `
                position: fixed;
                bottom: 10px;
                right: 10px;
                z-index: 1000000;
                background: ${this.BRAND_COLOR};
                color: #000;
                padding: 8px 15px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                font-weight: bold;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            `;
            hud.innerHTML = `
                <span id="asteroids-score">0</span> Points
                <span style="margin-left: 15px; opacity: 0.7; font-size: 12px;">ESC to Exit</span>
            `;
            document.body.appendChild(hud);
        },
        
        bindEvents: function() {
            // Keyboard
            this.keydownHandler = (e) => {
                this.keys[e.code] = true;
                
                if (e.code === 'Space') {
                    e.preventDefault();
                    this.shoot();
                }
                
                if (e.code === 'Escape') {
                    this.destroy();
                }
            };
            
            this.keyupHandler = (e) => {
                this.keys[e.code] = false;
            };
            
            // Resize
            this.resizeHandler = () => {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
                this.findEnemies(); // Recalculate enemy positions
            };
            
            document.addEventListener('keydown', this.keydownHandler);
            document.addEventListener('keyup', this.keyupHandler);
            window.addEventListener('resize', this.resizeHandler);
        },
        
        shoot: function() {
            const bullet = {
                x: this.ship.x + Math.cos(this.ship.angle) * this.ship.size,
                y: this.ship.y + Math.sin(this.ship.angle) * this.ship.size,
                vx: Math.cos(this.ship.angle) * this.BULLET_SPEED,
                vy: Math.sin(this.ship.angle) * this.BULLET_SPEED,
                life: 60 // frames
            };
            this.bullets.push(bullet);
        },
        
        createExplosion: function(x, y, color, count) {
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
                const speed = 2 + Math.random() * 4;
                this.particles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 30 + Math.random() * 20,
                    color: color,
                    size: 2 + Math.random() * 3
                });
            }
        },
        
        update: function() {
            // Ship rotation
            if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
                this.ship.angle -= this.ROTATION_SPEED;
            }
            if (this.keys['ArrowRight'] || this.keys['KeyD']) {
                this.ship.angle += this.ROTATION_SPEED;
            }
            
            // Ship thrust
            if (this.keys['ArrowUp'] || this.keys['KeyW']) {
                this.ship.vx += Math.cos(this.ship.angle) * 0.5;
                this.ship.vy += Math.sin(this.ship.angle) * 0.5;
            }
            
            // Apply friction
            this.ship.vx *= this.FRICTION;
            this.ship.vy *= this.FRICTION;
            
            // Limit speed
            const speed = Math.sqrt(this.ship.vx * this.ship.vx + this.ship.vy * this.ship.vy);
            if (speed > this.SHIP_SPEED) {
                this.ship.vx = (this.ship.vx / speed) * this.SHIP_SPEED;
                this.ship.vy = (this.ship.vy / speed) * this.SHIP_SPEED;
            }
            
            // Move ship
            this.ship.x += this.ship.vx;
            this.ship.y += this.ship.vy;
            
            // Wrap around screen
            if (this.ship.x < 0) this.ship.x = window.innerWidth;
            if (this.ship.x > window.innerWidth) this.ship.x = 0;
            if (this.ship.y < 0) this.ship.y = window.innerHeight;
            if (this.ship.y > window.innerHeight) this.ship.y = 0;
            
            // Update bullets
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                const bullet = this.bullets[i];
                bullet.x += bullet.vx;
                bullet.y += bullet.vy;
                bullet.life--;
                
                // Remove off-screen or expired bullets
                if (bullet.life <= 0 || 
                    bullet.x < 0 || bullet.x > window.innerWidth ||
                    bullet.y < 0 || bullet.y > window.innerHeight) {
                    this.bullets.splice(i, 1);
                    continue;
                }
                
                // Check collision with enemies
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemies[j];
                    if (enemy.destroyed) continue;
                    
                    // Simple rectangle collision
                    const rect = enemy.element.getBoundingClientRect();
                    if (bullet.x >= rect.left && bullet.x <= rect.right &&
                        bullet.y >= rect.top && bullet.y <= rect.bottom) {
                        
                        // Hit!
                        enemy.health--;
                        enemy.hit = true;
                        
                        // Flash the element
                        enemy.element.style.outline = `3px solid ${this.BRAND_COLOR}`;
                        setTimeout(() => {
                            if (enemy.element) {
                                enemy.element.style.outline = '';
                            }
                        }, 100);
                        
                        // Remove bullet
                        this.bullets.splice(i, 1);
                        
                        // Create small hit particles
                        this.createExplosion(bullet.x, bullet.y, this.BRAND_COLOR, 5);
                        
                        // Check if destroyed
                        if (enemy.health <= 0) {
                            enemy.destroyed = true;
                            
                            // Big explosion
                            this.createExplosion(
                                rect.left + rect.width / 2,
                                rect.top + rect.height / 2,
                                this.BRAND_COLOR,
                                20
                            );
                            
                            // Fade out and shrink the element
                            enemy.element.style.transition = 'all 0.5s ease-out';
                            enemy.element.style.transform = 'scale(0) rotate(180deg)';
                            enemy.element.style.opacity = '0';
                            
                            // Award points based on size
                            const points = Math.ceil(enemy.maxHealth * 10);
                            this.score += points;
                            this.updateScore();
                            
                            // Remove from enemies list
                            this.enemies.splice(j, 1);
                        }
                        
                        break;
                    }
                }
            }
            
            // Update particles
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1; // gravity
                p.life--;
                
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                }
            }
            
            // Reset enemy hit flags
            this.enemies.forEach(e => e.hit = false);
        },
        
        render: function() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw particles
            this.particles.forEach(p => {
                const alpha = p.life / 50;
                this.ctx.fillStyle = p.color;
                this.ctx.globalAlpha = alpha;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            });
            this.ctx.globalAlpha = 1;
            
            // Draw bullets
            this.ctx.fillStyle = this.BRAND_COLOR;
            this.bullets.forEach(bullet => {
                this.ctx.beginPath();
                this.ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
                this.ctx.fill();
            });
            
            // Draw ship
            this.ctx.save();
            this.ctx.translate(this.ship.x, this.ship.y);
            this.ctx.rotate(this.ship.angle);
            
            // Ship body (triangle)
            this.ctx.strokeStyle = this.BRAND_COLOR;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(this.ship.size, 0);
            this.ctx.lineTo(-this.ship.size * 0.7, -this.ship.size * 0.6);
            this.ctx.lineTo(-this.ship.size * 0.4, 0);
            this.ctx.lineTo(-this.ship.size * 0.7, this.ship.size * 0.6);
            this.ctx.closePath();
            this.ctx.stroke();
            
            // Thrust flame when accelerating
            if (this.keys['ArrowUp'] || this.keys['KeyW']) {
                this.ctx.fillStyle = '#ff6600';
                this.ctx.beginPath();
                this.ctx.moveTo(-this.ship.size * 0.4, -this.ship.size * 0.2);
                this.ctx.lineTo(-this.ship.size * (0.8 + Math.random() * 0.4), 0);
                this.ctx.lineTo(-this.ship.size * 0.4, this.ship.size * 0.2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
            
            // Draw enemy outlines (optional - shows hitboxes)
            // this.enemies.forEach(enemy => {
            //     if (!enemy.destroyed) {
            //         const rect = enemy.element.getBoundingClientRect();
            //         this.ctx.strokeStyle = 'rgba(255,0,0,0.3)';
            //         this.ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);
            //     }
            // });
        },
        
        updateScore: function() {
            const scoreEl = document.getElementById('asteroids-score');
            if (scoreEl) {
                scoreEl.textContent = this.score;
            }
        },
        
        gameLoop: function() {
            if (!this.isRunning) return;
            
            this.update();
            this.render();
            
            this.animationId = requestAnimationFrame(() => this.gameLoop());
        },
        
        destroy: function() {
            this.isRunning = false;
            window.ASTEROIDS_ACTIVE = false;
            
            // Cancel animation
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
            
            // Clear refresh interval
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }
            
            // Remove event listeners
            document.removeEventListener('keydown', this.keydownHandler);
            document.removeEventListener('keyup', this.keyupHandler);
            window.removeEventListener('resize', this.resizeHandler);
            
            // Remove canvas
            if (this.canvas) {
                this.canvas.remove();
            }
            
            // Remove HUD
            const hud = document.getElementById('asteroids-hud');
            if (hud) {
                hud.remove();
            }
            
            // Restore destroyed elements
            this.enemies.forEach(enemy => {
                if (enemy.destroyed && enemy.element) {
                    enemy.element.style.transition = '';
                    enemy.element.style.transform = '';
                    enemy.element.style.opacity = '';
                    enemy.element.style.outline = '';
                }
            });
            
            console.log(`🎮 Game Over! Final Score: ${this.score}`);
        }
    };
    
    // Expose to window
    window.asteroids = function() {
        if (window.ASTEROIDS_ACTIVE) {
            console.log('Asteroids is already running!');
            return;
        }
        ASTEROIDS.init();
    };
    
    // Konami Code activation
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
    let konamiIndex = 0;
    
    document.addEventListener('keydown', function(e) {
        if (window.ASTEROIDS_ACTIVE) return; // Don't trigger while playing
        
        if (e.code === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                konamiIndex = 0;
                window.asteroids();
            }
        } else {
            konamiIndex = 0;
        }
    });
    
    // Auto-start if loaded directly
    if (document.currentScript && document.currentScript.hasAttribute('data-autostart')) {
        window.asteroids();
    }
})();
