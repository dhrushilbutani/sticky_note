import { FormController } from '@web/views/form/form_controller';
import { patch } from "@web/core/utils/patch";
import { onWillStart , onWillUnmount , useState, onWillDestroy, Component , onMounted } from "@odoo/owl";
import { session } from "@web/session";
import { rpc } from "@web/core/network/rpc";
import { useService } from "@web/core/utils/hooks";


patch(FormController.prototype, {
   setup(){
    super.setup();
    this.positionQueue = new Map();
    this.titleQueue = new Map();
    this.contentQueue = new Map();
    this.colorQueue = new Map();
    this.notification = useService("notification");

    this.queueInterval = setInterval(this.processStickyNoteQueue.bind(this), 1000);
    this.stickyState = useState({
            stickyNotes: [],
        });
        onWillUnmount(() => {
            // Need to notify main component that the block was folded so it doesn't appear on the PDF.
            clearInterval(this.queueInterval)
        });
        onMounted(async () => {
            console.log(">>>>>onWillStart")
            this.sessionInfo = await rpc("/web/session/get_session_info");
            await this.addStickyOnOpenRecord()
        });
        onWillDestroy(()=>{
                console.log(">>>>>onWillDestroy")
                document.querySelectorAll('.sticky-note').forEach(el => el.remove());

        })
   },

   async addStickyOnOpenRecord(){
         if(this.sessionInfo.uid){
                const resModel =  this.model.root ? this.model.root.resModel : this.props.resModel;
                const resId = this.model.root ? this.model.root.resId : this.props.resId;
                const domain = [['record_ref','=', resModel+','+ resId],['user_id','=',this.sessionInfo.uid]]
                const note_recs = await this.orm.searchRead(
                            "sticky.note",
                            domain,
                            ["title","color","top","left","description","id"]
                        );

                note_recs.forEach((note)=> this.addStickyNote(note.top,note.left,note.title,note.description,note.color,note.id))
                }

   },

   async createNewStickyNode(){
        if(this.model.root && this.model.root.isNew){

            this.notification.add("You want to save record first.", {
                    title: "Id not found!",
                    type: "info",
                    sticky: false,
                });
            return;

        }
        const sticky_note_data = {
            user_id: this.sessionInfo.uid ? this.sessionInfo.uid:null,
            color: "#fffc8a",
            record_ref : this.model.root.resModel+","+this.model.root.resId,
        };
        const [note_id] = await this.orm.create("sticky.note", [sticky_note_data],);
        this.stickyState.stickyNotes.push(
                {
                    "id" : note_id,
                    "title" : "",
                    "top" : 150,
                    "left" : 150,
                    "description" : "",
                    "color" : "#fffc8a"
                }

        )
        this.addStickyNote(150,150,"","","#fffc8a",note_id)
   },

   addStickyNote(top,left,title,desription,color,resId){

        const note = document.createElement("div");
        note.className = "sticky-note";
        note.style.top = top+"px";
        note.style.left = left+"px";

        note.innerHTML = `
            <div class="drag-handle" data-id="${resId}">⠿ <span class="delete-btn" data-id="${resId}">❌</span></div>
            <input type="text" placeholder="Title..." value="${title ? title : ''}" data-id="${resId}"/>
            <textarea placeholder="Write something..." data-id="${resId}">${desription ? desription:''}</textarea>
            <input type="color" value="${color ? color : '#fffc8a'}" data-id="${resId}"/>
        `;

        // Delete note
        note.querySelector(".delete-btn").addEventListener("click", async (ev) => {
            note.remove();
            const resId = ev.target.dataset.id;
            await this.orm.unlink("sticky.note", [parseInt(resId)]);

        });

        // Update font color based on background
        const textInput = note.querySelector('input[type="text"]');
        textInput.addEventListener("input", function (ev) {
            const resId = parseInt(ev.target.dataset.id);
            const value = ev.target.value;

            this.titleQueue.set(resId, value);
        }.bind(this));


        // update textarea
        const textarea = note.querySelector('textarea');
        textarea.addEventListener("input", function (ev) {
            const resId = parseInt(ev.target.dataset.id);
            const value = ev.target.value;

            this.contentQueue.set(resId, value);
        }.bind(this));

        //update input text value
        const colorInput = note.querySelector('input[type="color"]');
        colorInput.addEventListener("input", async function (ev) {
            const color = ev.target.value;
            note.style.backgroundColor = color;
            const fontColor = this.getFontColorFromBg(color);
            note.style.color = fontColor;
            const resId =  parseInt(ev.target.dataset.id);
            this.colorQueue.set(resId, color);
        }.bind(this));



        // Dragging logic via drag handle
        const handle = note.querySelector(".drag-handle");
        let isDragging = false, offsetX = 0, offsetY = 0;
        handle.addEventListener("mousedown", function (e) {
            isDragging = true;
            offsetX = e.clientX - note.offsetLeft;
            offsetY = e.clientY - note.offsetTop;
            note.style.zIndex = 1;
            e.preventDefault(); // Avoid selecting text
        });

        document.addEventListener("mousemove", function (e) {

            if (isDragging) {
                note.style.left = (e.clientX - offsetX) + "px";
                note.style.top = (e.clientY - offsetY) + "px";
            }
        });

        document.addEventListener("mouseup", (ev) => {
            isDragging = false;

            const resId = ev.target.dataset.id;
            const closestStickyNote = ev.target.closest("div.sticky-note");

            if (closestStickyNote && resId) {
                const top = parseFloat(closestStickyNote.style.top || 150);
                const left = parseFloat(closestStickyNote.style.left || 150);

                // Save latest position for each note (overwrite if exists)
                this.positionQueue.set(parseInt(resId), { top, left });
            }
        });

        note.style.backgroundColor = color;
        // Append to page
        document.body.appendChild(note);

        // Initial font color update
        const initialColor = colorInput.value;
        note.style.color = this.getFontColorFromBg(initialColor);
    },

   async processStickyNoteQueue() {
        const allResIds = new Set([
            ...this.titleQueue.keys(),
            ...this.contentQueue.keys(),
            ...this.colorQueue.keys(),
            ...this.positionQueue.keys(),
        ]);

        for (const resId of allResIds) {
            const values = {};

            if (this.titleQueue.has(resId)) {
                values.title = this.titleQueue.get(resId);
                this.titleQueue.delete(resId);
            }

            if (this.contentQueue.has(resId)) {
                values.description = this.contentQueue.get(resId);
                this.contentQueue.delete(resId);
            }

            if (this.colorQueue.has(resId)) {
                values.color = this.colorQueue.get(resId);
                this.colorQueue.delete(resId);
            }

            if (this.positionQueue.has(resId)) {
                Object.assign(values, this.positionQueue.get(resId)); // adds top, left
                this.positionQueue.delete(resId);
            }

            try {
                await this.orm.write("sticky.note", [resId], values);
            } catch (e) {
                console.error(`Error updating sticky note ${resId}`, e);
            }
        }
    },

   getFontColorFromBg(hex) {
        const r = parseInt(hex.substr(1, 2), 16);
        const g = parseInt(hex.substr(3, 2), 16);
        const b = parseInt(hex.substr(5, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 125 ? "#000000" : "#ffffff";
    },

   async onPagerUpdate({ offset, resIds }){

           document.querySelectorAll('.sticky-note').forEach(el => el.remove());
           await super.onPagerUpdate(...arguments).then(async ()=>
                await this.addStickyOnOpenRecord()

           );



   },

   async create() {
        document.querySelectorAll('.sticky-note').forEach(el => el.remove());
        await super.create();
   }

   });
