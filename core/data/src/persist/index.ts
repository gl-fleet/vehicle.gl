import { Host, Connection, ReplicaSlave } from 'unet'
import { Sequelize, DataTypes } from 'sequelize'
import { tEvent } from './helper'

import { Chunk } from './models/chunk'
import { Event } from './models/event'
import { log } from 'utils'

export class Persist {

    public local: Host
    public cloud: Connection
    public sequelize: Sequelize

    public Chunk: Chunk
    public is_chunk_saving = false

    public Event: Event
    public event_cfg = {
        last_save: 0,
        is_saving: false,
        delay: 5000,
    }

    public data: any = {}
    public cbs: any = {}

    constructor({ cloud, local, sequelize }: { cloud: Connection, local: Host, sequelize: Sequelize }) {

        this.cloud = cloud
        this.local = local
        this.sequelize = sequelize

        this.Chunk = new Chunk({ cloud, local, sequelize })
        this.Event = new Event({ cloud, local, sequelize })

    }

    /** @___Callback_Events___ **/

    on = (key: tEvent, cb: any) => {
        this.cbs[key] = cb
    }

    emit = (key: tEvent, values: any): boolean => {
        try { return typeof this.cbs[key] === 'undefined' ? true : this.cbs[key](values) } catch { return false }
    }

    /** @___Callback_Events___ **/

    save_event = ({ type, name, data }: { type: string, name: string, data: any }) => {

        if (this.event_cfg.is_saving) return log.warn(`[Event.save] is busy right now!`)
        if ((Date.now() - this.event_cfg.last_save) <= this.event_cfg.delay) return true // log.warn(`[Event.save] please wait for ${this.event_cfg.delay!}`)

        this.event_cfg.is_saving = true
        this.event_cfg.last_save = Date.now()

        this.Event.set({ type, name, data })
            .then((e) => { log.success(`[Event.save] ${e}`) })
            .catch((e) => { log.error(`[Event.save] ${e.message}`) })
            .finally(() => { this.event_cfg.is_saving = false })

    }

}