// Animation and IntersectionObserver setup
const ratio = 0.05
const options = {
    root: null,
    rootMargin: '0px',
    threshold: ratio
}

const handleIntersect = function(entries, observer) {
    entries.forEach(function(entry) {
        if (entry.intersectionRatio > ratio) {
            entry.target.classList.add('reveal-visible')
            observer.unobserve(entry.target)
        }
    });
}

// Carousel Class
class Carousel {
    /**
     * @param {HTMLElement} element 
     * @param {object} options 
     * @param {object} options.slidesToScroll Nombre d'éléments à faire défiler 
     * @param {object} options.slidesVisible Nombre d'éléments visibles 
     * @param {boolean} options.loop doit-on boucler en fin de carousel 
     * @param {boolean} options.pagination 
     * @param {boolean} options.navigation
     * @param {boolean} options.infinite
     */
    constructor(element, options = {}) {
        this.element = element
        this.options = Object.assign({}, {
            slidesToScroll: 1,
            slidesVisible: 1,
            loop: false,
            pagination: false,
            navigation: true,
            infinite: false
        }, options)
        
        if (this.options.infinite && this.options.loop) {
            throw new Error('Un carrousel ne peut être à la fois en boucle et en infini')
        }
        
        let children = [].slice.call(element.children)
        this.isMobile = false
        this.currentItem = 0
        this.moveCallBacks = []
        this.offset = 0

        // Touch swipe tracking variables
        this.touchStartX = null
        this.touchStartY = null
        this.touchDragX = 0
        this.touchStartTime = 0

        // Modification of the DOM
        this.root = this.createDivWithClass('carousel')
        this.container = this.createDivWithClass('carousel__container')
        this.root.setAttribute('tabindex', '0')
        this.root.appendChild(this.container)
        this.element.appendChild(this.root)
        
        this.items = children.map((child) => {
            let item = this.createDivWithClass('carousel__item')
            item.appendChild(child)
            return item 
        })
        
        if (this.options.infinite) {
            this.offset = this.options.slidesVisible + this.options.slidesToScroll
            if (this.offset > children.length) {
                console.error("Vous n'avez pas assez d'éléments dans le carrousel", element)
            }
            this.items = [
                ...this.items.slice(this.items.length - this.offset).map(item => item.cloneNode(true)),
                ...this.items,
                ...this.items.slice(0, this.offset).map(item => item.cloneNode(true))
            ]
            this.goToItem(this.offset, false)
        }
        
        this.items.forEach(item => this.container.appendChild(item))
        this.setStyle()
        
        if (this.options.navigation) {
            this.createNavigation()
        }
        if (this.options.pagination) {
            this.createPagination()
        }
        
        // Event listeners
        this.moveCallBacks.forEach(cb => cb(this.currentItem))
        window.addEventListener('resize', this.onWindowResize.bind(this))
        this.onWindowResize()
        
        this.root.addEventListener('keyup', e => {
            if (e.key === 'ArrowRight' || e.key == 'Right') {
                this.next()
            } else if (e.key === 'ArrowLeft' || e.key == 'Left') {
                this.prev()
            }
        })
        
        if (this.options.infinite) {
            this.container.addEventListener('transitionend', this.resetInfinite.bind(this))
        }

        // Add mobile touch-swipe support
        this.container.addEventListener('touchstart', this.dragStart.bind(this), { passive: true })
        this.container.addEventListener('touchmove', this.drag.bind(this), { passive: true })
        this.container.addEventListener('touchend', this.dragEnd.bind(this))
    }

    /**
     * Applique les bonnes dimensions aux éléments du carrousel
     */
    setStyle() {
        let ratio = this.items.length / this.slidesVisible
        this.container.style.width = (ratio * 100) + '%'
        this.items.forEach(item => item.style.width = ((100 / this.slidesVisible) / ratio) + '%');
    }

    /**
     * Crée les flèches de navigation
     */
    createNavigation() {
        let nextbutton = this.createDivWithClass('carousel__next')
        let prevbutton = this.createDivWithClass('carousel__prev')
        this.root.appendChild(nextbutton)
        this.root.appendChild(prevbutton)
        nextbutton.addEventListener('click', this.next.bind(this))
        prevbutton.addEventListener('click', this.prev.bind(this))
        
        if (this.options.loop === true) {
            return
        }
        
        this.onMove(index => {
            if (index === 0) {
                prevbutton.classList.add('carousel__prev--hidden')
            } else {
                prevbutton.classList.remove('carousel__prev--hidden')
            }
            
            if (this.items[this.currentItem + this.slidesVisible] === undefined) {
                nextbutton.classList.add('carousel__next--hidden')
            } else {
                nextbutton.classList.remove('carousel__next--hidden')
            }
        })
    }

    /**
     * Crée la pagination (points indicateurs)
     */
    createPagination() {
        let pagination = this.createDivWithClass('carousel__pagination')
        let buttons = []
        this.root.appendChild(pagination)
        for (let i = 0; i < (this.items.length - 2 * this.offset); i = i + this.options.slidesVisible) {
            let button = this.createDivWithClass('carousel__pagination__button')
            button.addEventListener('click', () => this.goToItem(i + this.offset))
            pagination.appendChild(button)
            buttons.push(button)
        }
        
        this.onMove(index => {
            let count = this.items.length - 2 * this.offset
            let activeButton = buttons[Math.floor(((index - this.offset) % count) / this.options.slidesToScroll)]
            if (activeButton) {
                buttons.forEach(button => button.classList.remove('carousel__pagination__button--active'))
                activeButton.classList.add('carousel__pagination__button--active')
            }
        })
    }

    next() {
        this.goToItem(this.currentItem + this.slidesToScroll)
    }

    prev() {
        this.goToItem(this.currentItem - this.slidesToScroll)
    }

    /**
     * Déplace le carrousel vers l'élément ciblé
     * @param {number} index 
     * @param {boolean} animation 
     */
    goToItem(index, animation = true) {
        if (index < 0) {
            if (this.options.loop) {
                index = this.items.length - this.slidesVisible
            } else {
                return
            }
        } else if (index >= this.items.length || (this.items[this.currentItem + this.slidesVisible] === undefined && index > this.currentItem)) {
            if (this.options.loop) {
                index = 0
            } else {
                return
            }
        }
        
        let translateX = index * (-100 / this.items.length)
        if (animation === false) {
            this.container.style.transition = 'none'
        }
        this.container.style.transform = 'translate3d(' + translateX + '%,0,0)'
        this.container.offsetHeight // force layout repaint
        if (animation === false) {
            this.container.style.transition = ''
        }
        this.currentItem = index
        this.moveCallBacks.forEach(cb => cb(index))
    }

    /**
     * Déplace le conteneur pour donner l'impression d'un défilement infini
     */
    resetInfinite() {
        if (this.currentItem <= this.options.slidesToScroll) {
            this.goToItem(this.currentItem + (this.items.length - 2 * this.offset), false)
        } else if (this.currentItem >= this.items.length - this.offset) {
            this.goToItem(this.currentItem - (this.items.length - 2 * this.offset), false)
        }
    }

    onMove(cb) {
        this.moveCallBacks.push(cb)
    }

    onWindowResize() {
        let mobile = window.innerWidth <= 791
        if (mobile !== this.isMobile) {
            this.isMobile = mobile
        }
        this.setStyle()
        this.moveCallBacks.forEach(cb => cb(this.currentItem))
    }

    /**
     * Helpers methods for mobile swiping
     */
    dragStart(e) {
        this.touchStartX = e.touches[0].clientX
        this.touchStartY = e.touches[0].clientY
        this.touchDragX = 0
        this.touchStartTime = Date.now()
        this.container.style.transition = 'none'
    }

    drag(e) {
        if (!this.touchStartX) return
        const x = e.touches[0].clientX
        const y = e.touches[0].clientY
        
        // Only trigger horizontal swipe if horizontal movement is larger than vertical movement
        if (Math.abs(x - this.touchStartX) > Math.abs(y - this.touchStartY)) {
            this.touchDragX = x - this.touchStartX
            const translateX = this.currentItem * (-100 / this.items.length) + (this.touchDragX / this.container.offsetWidth) * 100
            this.container.style.transform = `translate3d(${translateX}%,0,0)`
        }
    }

    dragEnd() {
        if (!this.touchStartX) return
        this.container.style.transition = ''
        
        const dragThreshold = this.container.offsetWidth / 5
        const timeDiff = Date.now() - this.touchStartTime
        
        if (this.touchDragX < -dragThreshold || (this.touchDragX < -50 && timeDiff < 250)) {
            this.next()
        } else if (this.touchDragX > dragThreshold || (this.touchDragX > 50 && timeDiff < 250)) {
            this.prev()
        } else {
            this.goToItem(this.currentItem)
        }
        
        this.touchStartX = null
        this.touchStartY = null
    }

    createDivWithClass(className) {
        let div = document.createElement('div')
        div.setAttribute('class', className)
        return div
    }

    get slidesVisible() {
        return this.isMobile ? 1 : this.options.slidesVisible
    }

    get slidesToScroll() {
        return this.isMobile ? 1 : this.options.slidesToScroll
    }
}

// Theme Preference Initialization (run immediately to avoid layout flash)
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
} else if (savedTheme === 'dark') {
    document.body.classList.remove('light-theme');
} else {
    // Default to dark mode for this site, but check system preference
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    if (prefersLight) {
        document.body.classList.add('light-theme');
    }
}

// Initializations
document.documentElement.classList.add('reveal-loaded')

document.addEventListener('DOMContentLoaded', function() {
    new Carousel(document.querySelector('#carousel1'), {
        slidesToScroll: 1,
        slidesVisible: 4,
        infinite: true
    })
    
    new Carousel(document.querySelector('#carousel2'), {
        slidesToScroll: 1,
        slidesVisible: 4,
        infinite: true
    })
    
    const observer = new IntersectionObserver(handleIntersect, options)
    document.querySelectorAll("[class*='reveal']").forEach(function(r) {
        observer.observe(r)
    })

    // Theme Toggle Handler — syncs both desktop and mobile buttons
    function applyThemeToggle() {
        document.body.classList.toggle('light-theme');
        localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
    }

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', applyThemeToggle);
    }

    const themeToggleMobile = document.getElementById('theme-toggle-mobile');
    if (themeToggleMobile) {
        themeToggleMobile.addEventListener('click', applyThemeToggle);
    }
})
