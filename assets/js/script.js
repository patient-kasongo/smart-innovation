// appartion au défilement
const ratio=0.1
const options={
    root:null,
    rootMargin:'0px',
    threshold: ratio
}
const handleIntersect=function(entries,observer){
    entries.forEach(function(entry){
        if(entry.intersectionRatio>ratio){
            entry.target.classList.add('reveal-visible')
            observer.unobserve(entry.target)
        }
    });
}


// carousell

class Carousel{
    /**
     * @param {HTMLElement} element 
     * @param {object} options 
     * @param {object} options.slidesToScroll Nombre d'élement à faire défiler 
     * @param {object} options.slidesToScroll Nombre d'élement visible 
     * @param {boolean} options.loop doit-on boucler en fin de carousel 
     * @param {boolean} options.pagination 
     * @param {boolean} options.navigation
     * @param {boolean} options.infinite
     */
    constructor(element,options={}){
        this.element=element
        this.options=Object.assign({},{
            slidesToScroll:1,
            slidesVisible:1,
            loop:false,
            pagination:false,
            navigation:true,
            infinite:false
        },options)
        if(this.options.infinite && this.options.loop){
            throw new Error('un carrousel ne peut être à la fois en boucle et en infinie')
        }
        let children=[].slice.call(element.children)
        this.isMobile=false
        this.currentItem=0
        this.moveCallBacks=[]
        this.offset=0

        // Modification du DOM
        this.root=this.createDivWithClass('carousel')
        this.container=this.createDivWithClass('carousel__container')
        this.root.setAttribute('tabindex','0')
        this.root.appendChild(this.container)
        this.element.appendChild(this.root)
        this.items=children.map((child)=>{
            let item=this.createDivWithClass('carousel__item')
            item.appendChild(child)
            return item 
        })
        if(this.options.infinite){
            this.offset=this.options.slidesVisible + this.options.slidesToScroll
            if(this.offset > children.length){
                console.error("vous n'avez assez d'élements dans le carousel",element)
            }
            this.items=[
                ...this.items.slice(this.items.length-this.offset).map(item=>item.cloneNode(true)),
                ...this.items,
                ...this.items.slice(0,this.offset).map(item=>item.cloneNode(true))
            ]
            this.goToItem(this.offset,false)
        }
        this.items.forEach(item=>this.container.appendChild(item))
        this.setStyle()
        if(this.options.navigation){
            this.createNavigation()
        }
        if(this.options.pagination){
            this.createPagination()
        }
        // Evénement
        this.moveCallBacks.forEach(cb=>cb(this.currentItem))
        window.addEventListener('resize',this.onWindowResize.bind(this))
        this.onWindowResize()
        this.root.addEventListener('keyup',e=>{
            if(e.key === 'ArrowRight' || e.key=='Right'){
                this.next()
            }else if(e.key === 'ArrowLeft' || e.key=='Left'){
                this.prev()
            }
        })
        if(this.options.infinite){
            this.container.addEventListener('transitionend', this.resetInfinite.bind(this))
        }
    }
    /**
     * applique les bonnes dimentions aux élement du carrousel
     */
    setStyle(){
        let ratio=this.items.length/this.slidesVisible
        this.container.style.width=(ratio * 100)+'%'
        this.items.forEach(item => item.style.width=((100/this.slidesVisible)/ratio)+'%');
    }
    /**
     * Cette fonction nous permet de creer les flèches de navigation
     */
    createNavigation(){
        let nextbutton=this.createDivWithClass('carousel__next')
        let prevbutton=this.createDivWithClass('carousel__prev')
        this.root.appendChild(nextbutton)
        this.root.appendChild(prevbutton)
        nextbutton.addEventListener('click',this.next.bind(this))
        prevbutton.addEventListener('click',this.prev.bind(this))
        if(this.options.loop===true){
            return
        }
        this.onMove(index=>{
            if(index===0){
                prevbutton.classList.add('carousel__prev--hidden')
            }else{
                prevbutton.classList.remove('carousel__prev--hidden')
            }
            if(this.items[this.currentItem + this.slidesVisible]===undefined){
                nextbutton.classList.add('carousel__next--hidden')
            }else{
                nextbutton.classList.remove('carousel__next--hidden')
            }
        })
    }
    /**
     * Cette fonction nous permet de creer la pagination
     */
    createPagination(){
        let pagination=this.createDivWithClass('carousel__pagination')
        let buttons=[]
        this.root.appendChild(pagination)
        for(let i=0;i<(this.items.length - 2*this.offset);i=i+this.options.slidesVisible){
            let button=this.createDivWithClass('carousel__pagination__button')
            button.addEventListener('click',()=>this.goToItem(i + this.offset))
            pagination.appendChild(button)
            buttons.push(button)
        }
        this.onMove(index=>{
            let count=this.items.length- 2*this.offset
            let activeButton=buttons[Math.floor(((index-this.offset) % count)/this.options.slidesToScroll)]
            if(activeButton){
                buttons.forEach(button=>button.classList.remove('carousel__pagination__button--active'))
                activeButton.classList.add('carousel__pagination__button--active')
            }
        })
        
    }
    next(){
        this.goToItem(this.currentItem + this.slidesToScroll)
    }
    prev(){
        this.goToItem(this.currentItem - this.slidesToScroll)
    }
    /**
     * Déplace le carousel vers l'élement ciblé
     * @param {number} index 
     * @param {boolean} animation 
     */
    goToItem(index,animation = true){
        if(index<0){
            if(this.options.loop){
                index=this.items.length - this.slidesVisible
            }else{
                return
            }
        }else if(index>=this.items.length || (this.items[this.currentItem + this.slidesVisible]===undefined && index>this.currentItem)){
            if(this.options.loop){
                index=0
            }else{
                return
            }
        }
        let translateX=index *(-100/this.items.length)
        if(animation===false){
            this.container.style.transition='none'
        }
        this.container.style.transform='translate3d(' + translateX +'%,0,0)'
        this.container.offsetHeight //force repeat
        if(animation===false){
            this.container.style.transition=''
        }
        this.currentItem=index
        this.moveCallBacks.forEach(cb=>cb(index))
    }
    /**
     * elle va déplacer le container pour donner l'impression d'un slide infini
     */
    resetInfinite(){
        if(this.currentItem<= this.options.slidesToScroll){
            this.goToItem(this.currentItem+(this.items.length -2*this.offset),false)
        }else if(this.currentItem>=this.items.length-this.offset){
            this.goToItem(this.currentItem-(this.items.length -2*this.offset),false)
        }
    }
    onMove(cb){
        this.moveCallBacks.push(cb)
    }
    onWindowResize(){
        let mobile=window.innerWidth<800
        if(mobile !== this.isMobile){
            this.isMobile=mobile
        }
        this.setStyle()
        this.moveCallBacks.forEach(cb=>cb(this.currentItem))
    }
    /**
     * 
     * @param {string} className
     * @return {HTMLelement} 
     */
    createDivWithClass(className){
        let div=document.createElement('div')
        div.setAttribute('class',className)
        return div
    }
    get slidesVisible(){
        return this.isMobile ? 1: this.options.slidesVisible
    }
    get slidesToScroll(){
        return this.isMobile ? 1: this.options.slidesToScroll
    }
}
document.documentElement.classList.add('reveal-loaded')
document.addEventListener('DOMContentLoaded',function(){
    new Carousel(document.querySelector('#carousel1'),{
        slidesToScroll:1,
        slidesVisible:4,
        infinite:true
    })
    new Carousel(document.querySelector('#carousel2'),{
        slidesToScroll:1,
        slidesVisible:4,
        infinite:true
    })
    const observer=new IntersectionObserver(handleIntersect,options)
    document.querySelectorAll("[class*='reveal']").forEach(function(r){
        observer.observe(r)
    })  
    
})


