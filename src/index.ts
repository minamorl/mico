const snabbdom = require('snabbdom');
const patch = snabbdom.init([ // Init patch function with chosen modules
    require('snabbdom/modules/class').default, // makes it easy to toggle classes
    require('snabbdom/modules/props').default, // for setting properties on DOM elements
    require('snabbdom/modules/style').default, // handles styling on elements with support for animations
    require('snabbdom/modules/eventlisteners').default, // attaches event listeners
])

import {h} from "snabbdom/h"
import {VNode} from "snabbdom/vnode"
import {toVNode} from "snabbdom/tovnode"

export type Action = (states: {}) => void
export class Portal {
    private actions: Map<Symbol, Action>
    private states: Map<string, any> = new Map()
    constructor() {
        this.actions = new Map()
    }
    transfer(states: Map<string, any>) {
        this.states = new Map([...this.states, ...states])
        for (let action of this.actions)
            action[1](states)
    }
    get(name: string) {
        return this.states.get(name)
    }
    registerAction(identity: Symbol, action: Action) {
        return this.actions.set(identity, action)
    }
 }
type ContainableObject = string | Array<Micox> | Micox | null

type PortalCallback<T> = (portal: Portal) => T
type ContentFunction = PortalCallback<ContainableObject>
type PropsFunction = PortalCallback<{[key: string]: string}>
type EventsFunction = PortalCallback<{[key: string]: (event: any) => any}>
type AttrsFunction = PortalCallback<{[key: string]: string | boolean | null}>

export class Micox {
    private portal?: Portal
    public element: VNode
    private elementType: string = "div"
    private elementData: {[key: string]: any} = {}
    private propsFunc?: PropsFunction
    private eventsFunc?: EventsFunction
    private attrsFunc?: AttrsFunction
    private content: ContentFunction | ContainableObject | string | null = null
    private vnode?: VNode
    private symbol: Symbol = Symbol()
    constructor(portal?: Portal, patchTo?: HTMLElement) {
        this.portal = portal
        this.element = patchTo ? h(this.elementType, {props: {id: patchTo.id}}) : h(this.elementType)
        this.vnode = patchTo ? patch(toVNode(patchTo), this.element) : undefined
        if(portal) this.setPortal(portal)
        else this.update()
    }
    setPortal = (portal: Portal) => {
        this.portal = portal
        portal.registerAction(this.symbol, this.update)
        this.update()
    }
    contains = (content: ContentFunction | ContainableObject | string) => {
        this.content = content
        this.update()
        return this
    }
    as = (type: string) => {
        this.elementType = type
        this.update()
        return this
    }
    private setProps = (props: {[key: string]: string}) => {
        this.elementData["props"] = {...this.elementData["props"], ...props}
    }
    props = (props: PropsFunction | {[key: string]: string}) => {
        if (typeof props === "function")
            this.propsFunc = props
        else
            this.setProps(props)
        this.update()
        return this
    }
    id = (id: string) => {
        return this.props({id})
    }
    class = (className: string) => {
        return this.props({class: className})
    }
    private setEvents = (events: {[key: string]: (ev: any) => any}) => {
        this.elementData["on"] = {...this.elementData["on"], ...events}
    }
    events = (events: EventsFunction | {[key: string]: (ev: any) => any}) => {
        if (typeof events === "function")
            this.eventsFunc = events
        else
            this.setEvents(events)
        this.update()
        return this
    }
    private setAttrs = (attrs: {[key: string]: string | boolean | null}) => {
        this.elementData["attrs"] = {...this.elementData["attrs"], ...attrs}
    }
    attrs = (attrs: AttrsFunction | {[key: string]: string | boolean | null}) => {
        if (typeof attrs === "function")
            this.attrsFunc = attrs
        else
            this.setAttrs(attrs)
        this.update()
        return this
    }
    update = () => {
        const content = (this.portal && typeof this.content === "function") ? this.content(this.portal) : this.content
        if (!this.portal && typeof this.content === "function") {
            throw "Fatal: Cannot find a portal object."
        }
        if (this.portal && this.propsFunc) {
            const props = this.propsFunc(this.portal)
            this.setProps(props)
        }
        if (this.portal && this.eventsFunc) {
            const events = this.eventsFunc(this.portal)
            this.setEvents(events)
        }
        if (this.portal && this.attrsFunc) {
            const events = this.attrsFunc(this.portal)
            this.setAttrs(events)
        }
        if (typeof content === "string") {
            this.element = h(this.elementType, this.elementData, content)
        } else if (content instanceof Micox) {
            this.element = h(this.elementType, this.elementData, content.element)
        } else if (Array.isArray(content)) {
            let dom = []
            for(let micoxObj of content) {
                dom.push(micoxObj.element)
            }
            this.element = h(this.elementType, this.elementData, dom)
        } else {
            this.element = h(this.elementType, this.elementData)
        }
        if(this.vnode) {
            this.vnode = patch(this.vnode, this.element)
        }
    }
}

const micoxWrapper = (name: string) => new Micox().as(name).contains
export const html = {
    div: micoxWrapper("div")
}
