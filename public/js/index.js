import Builder from "./Builder.js";
import Util, { UIEventHandler } from "./Util.js";
import Language from "./Language.js";

// Change from desktop or mobile version if screen is too big or too small
window.addEventListener("resize", () => {
    const url = new URL(window.location.href);
    if(!url.pathname.endsWith("mobile.html") && window.innerWidth < 1003) {
        url.pathname += "mobile.html";
        window.location.replace(url);
    } else if(url.pathname.endsWith("mobile.html") && window.innerWidth >= 1003) {
        url.pathname = url.pathname.replace("mobile.html", "");
        window.location.replace(url);
    }
});

const builder = new Builder(window.innerWidth < 1003);


window.onload = async () => {
    // Load language
    builder.lang = new Language(document.getElementById("langDrop"));
    const fetchLang = builder.lang.handleSelect(builder.loadLanguage, builder);

    // Bind Events on page 
    if(builder.mobile) {
        //Detect when you dont click on x part of the document
        document.addEventListener("click", ev => {
            if(document.querySelector("#description_card.active") && ev.target.tagName !== "BODY" && !ev.target.closest("#description_card.active")) {
                builder.gui.DescriptionCard_Show(false);
            }
            if(document.querySelector(".sk_tree_button_group.active") && !ev.target.closest("#sk_tree_buttons button, .sk_tree_button_group")) {
                builder.gui.Tree_ShowSelection(false);
            }
        });

        //Make the X of description do something
        document.querySelector("#description_card > a").addEventListener("click", () =>
            builder.gui.DescriptionCard_Show(false)
        );
        
        { //Slide to exit description
            const desc = document.getElementById("description_card");
            let remaining = 0, startX = 0, currentTouch = null, listen = false;

            desc.addEventListener("touchstart", ev => {
                if(currentTouch !== null) return;
                const touch = ev.touches.item(0);
                currentTouch = touch.identifier;

                startX = touch.clientX;
                listen = true;
            });
            desc.addEventListener("touchmove", ev => {
                if(!listen) return;
                ev.preventDefault();

                const touch = Util.findTouch(ev.changedTouches, currentTouch);
                if(touch) {
                    remaining = -(touch.clientX - startX);
                    if(remaining > 0) remaining = 0;
                    builder.gui.DescriptionCard_Analog(remaining);
                }
            });
            desc.addEventListener("touchend", ev => {
                if(!listen || Util.findTouch(ev.touches, currentTouch)) return;

                if(ev.touches.length > 0) {
                    currentTouch = ev.touches.item(0).identifier;
                } else { 
                    currentTouch = null;
                    if(remaining <= desc.clientWidth/-3) {
                        builder.gui.DescriptionCard_Show(false);
                    } else {
                        builder.gui.DescriptionCard_Show();
                    }
                    listen = false;
                }
            }, { passive: true });
            desc.addEventListener("touchcancel", () => {
                currentTouch = null;
                builder.gui.DescriptionCard_Show();            
            });
        }

        //Show selection of trees when clicking the tree button
        document.querySelector("#sk_tree_buttons button").addEventListener("click", () =>
            builder.gui.Tree_ShowSelection()
        );

        //Previous and Next button for easy use
        document.getElementById("sk_prev_tree").addEventListener("click", ev => {
            if(ev.target.classList.contains("hidden")) return;
            const trees = [...document.querySelectorAll(".sk_tree_button_group > div")];
            const index = trees.findIndex(el => 
                el.classList.contains("sk_tree_button_active")
            );
            trees[index - 1].click();
        });

        document.getElementById("sk_next_tree").addEventListener("click", ev => {
            if(ev.target.classList.contains("hidden")) return;
            const trees = [...document.querySelectorAll(".sk_tree_button_group > div")];
            const index = trees.findIndex(el => 
                el.classList.contains("sk_tree_button_active")
            );
            trees[index + 1].click();
        });

        builder.scrollTransformer.addContext(document.getElementById("tab_page_buttons"), -1);
    }

    // in which we add an event listener to the disable infamy checkbox to make it Do A Thing
    /* document.getElementById("chk_disable_infamy").addEventListener("change", ev => {
        
        // first things first, we update this infamyDisabled value.
        builder.exp.infamyDisabled = ev.target.checked;

        // then we Validate Skills where all the complex stuff happens
        builder.sys.Validate_Skills(); // (this is very overengineered)

        // then update URL params with our newly validated build
        if(ev.isTrusted || ev.detail == -1) {
            window.history.pushState(
                Util.makeState(null, builder.exp, builder.gui.Tab_Current),
                `disable infamy checkbox changed to ${ev.target.checked}`,
                builder.io.GetEncodedBuild()
            );
        }
    }); */

    // Tab page navigation //
    document.querySelectorAll("#tab_page_buttons button").forEach(e => {      
        e.addEventListener("click", () => {
            const targetTab = e.getAttribute("id").replace("_button", "_page");
            if (builder.gui.Tab_IsOn(targetTab)) return;

            if (targetTab === "tab_io_page") { // Display build string when changing to save/load tab 
                document.getElementById("io_share_link").value = builder.io.GetEncodedBuild(); 
            }

            builder.gui.HandleRequirements(e.getAttribute("id").replace(/tab_|_button/g, ""));

            builder.gui.Tab_ChangeTo(targetTab); 
            window.sessionStorage.setItem("curTab", targetTab);
        });
    }); 

    // Skill tab navigation //
    for (const value of Builder.TREES) {
        document.getElementById(`sk_${value}_button`).addEventListener("click", event => {
            builder.gui.Tree_ChangeTo(event.target.id.replace("button", "container"));
            if(builder.mobile) builder.gui.Tree_ShowSelection(false);
        }); 
    }
    

    // Want websites to behave like games? Call me // 
    for (const e of document.getElementsByClassName("mousewheel_scrollable")) {
        e.addEventListener("wheel", (event) => {
            if (event.deltaY < 0) {
                builder.gui.Tree_ChangeByScrolling(false); 
            } else {
                builder.gui.Tree_ChangeByScrolling(true); 
            }
            event.preventDefault();
        }); 
    }
    

    // Subtree //
    for(const e of document.getElementsByClassName("sk_subtree")) {
        e.addEventListener("mouseenter", () => {
            builder.gui.Subtree_HoveringHighlightOn(e); 
        });

        e.addEventListener("mouseleave", () => {
            builder.gui.Subtree_HoveringHighlightOff(); 
        });
    }

    // Skill Icon buttons //
    for(const e of document.getElementsByClassName("sk_icon")) {
        // Values for touch: double and successHolding being booleans and holding an ID for timeouts
        let successHolding = false;

        // On click event, add skill
        e.addEventListener("click", ev => {
            // If mobile version, disregard user events. (they fire from UIEventHandler, click included)
            if (builder.mobile && ev.isTrusted) return; 
            
            if(successHolding) {
                successHolding = false;
                ev.stopPropagation();
                return;
            }

            const id = e.firstElementChild.id; 

            if (e.classList.contains("sk_locked") || e.classList.contains("sk_selected_aced")) {
                builder.gui.Skill_AnimateInvalid(e);
                return;
            }

            if (builder.sys.Skill_Add(id)) {
                builder.gui.Skill_Add(e);

                switch(id){
                case "iron_man":
                    // if the user just equipped Iron Man aced, give them a free ICTV.
                    if (e.classList.contains("sk_selected_aced")){
                        builder.exp.armor = "ictv";
                        builder.gui.Armor_SelectById("ictv");
                    }
                    break;
                
                case "jack_of_all_trades":
                    // if the user just equipped JOAT aced
                    if (e.classList.contains("sk_selected_aced")){
                        // do the thing
                        builder.gui.HandleJoat();
                    }
                    break;
                }

                //if(id === "jack_of_all_trades" && e.classList.contains("sk_selected_aced")) builder.gui.HandleJoat(); 

                const s = builder.dbs.get("skills").get(id);
                builder.gui.Skill_UpdatePointsRemaining(builder.exp.skills.points);
                builder.gui.Subtree_MoveBackground(s.subtree, builder.exp.subtrees[s.subtree].points);

                if(ev.isTrusted || ev.detail == -1) {
                    window.history.pushState(
                        Util.makeState(null, builder.exp, builder.gui.Tab_Current),
                        `added skill ${id}`,
                        builder.io.GetEncodedBuild()
                    );
                }
            } else {
                builder.gui.Skill_AnimateInvalid(e);
            }
        });

        // When right click, remove skill
        e.addEventListener("contextmenu", ev => {
            ev.preventDefault(); 
            const id = e.firstElementChild.id; 

            if (builder.sys.Skill_Remove(id)) { 

                // but first, we need to make sure we unselect things we now can't use
                switch(id){
                case "iron_man":
                    // if we're removing the aced version, unequip ICTV if equipped.
                    if (e.classList.contains("sk_selected_aced")){
                        if (builder.exp.armor === "ictv"){
                            builder.gui.Armor_Unselect();
                            builder.exp.armor = null;
                        }
                    }
                    break;
                
                case "engineering":
                    // remove suppressed sentries if removing basic tier.
                    if (e.classList.contains("sk_selected_basic")){
                        if (builder.exp.deployableSecondary === "suppressed_sentry_gun"){
                            // if our secondary is suppressed, we discard it.
                            builder.exp.deployableSecondary = null;
                            builder.gui.DeployableSecondary_Unselect();
                        } else if (builder.exp.deployable === "suppressed_sentry_gun"){
                            // if our primary is suppressed
                            if (builder.exp.deployableSecondary !== null){
                                // we first see if we have a secondary deployable.
                                // if so, we promote our secondary deployable to our primary deployable
                                const secondaryDep = document.querySelector(".dp_secondary");
                                builder.gui.DeployableSecondary_Unselect();
                                builder.exp.deployable = builder.exp.deployableSecondary;
                                builder.exp.deployableSecondary = null;
                                builder.gui.Deployable_Select(secondaryDep);
                            } else {
                                // otherwise, we just unselect our one deployable.
                                builder.exp.deployable = null;
                                builder.gui.Deployable_Unselect(
                                    document.querySelector(".dp_primary, .dp_selected")
                                );
                            }
                        }
                    }
                    break;
                
                case "jack_of_all_trades":
                    // if we're removing jack of all trades aced
                    if (e.classList.contains("sk_selected_aced")){
                        // do the thing
                        builder.gui.HandleJoat(true);
                        // unselect our secondary deployable
                        builder.exp.deployableSecondary = null;
                        builder.gui.DeployableSecondary_Unselect();
                    }
                    break;
                }

                // now we remove the skill in the GUI
                builder.gui.Skill_Remove(e);
                
                
                /*
                if(id === "jack_of_all_trades" && !e.classList.contains("sk_selected_aced")){
                    builder.gui.HandleJoat(); 
                }*/

                const s = builder.dbs.get("skills").get(id);
                builder.gui.Skill_UpdatePointsRemaining(builder.exp.skills.points);
                builder.gui.Subtree_MoveBackground(s.subtree, builder.exp.subtrees[s.subtree].points);
                builder.gui.HandleUnlocks({
                    type: "skill",
                    id,
                    unlocks: s.unlocks
                });

                if(ev.isTrusted || ev.detail == -1) {
                    window.history.pushState(
                        Util.makeState(null, builder.exp, builder.gui.Tab_Current),
                        `removed skill ${id}`,
                        builder.io.GetEncodedBuild()
                    );
                }
            } else {
                builder.gui.Skill_AnimateInvalid(e);
            }
        });

        //not mobile? mouse enter to the icon shows the description of such
        if(!builder.mobile) e.addEventListener("mouseenter", () => {
            const id = e.firstElementChild.id; 
            
            if (document.getElementsByClassName("sk_description")[0].dataset.skill !== id) {
                builder.gui.Skill_DisplayDescription(id); 
            }
        });

        new UIEventHandler({
            hold: () => {
                successHolding = true;
                const id = e.firstElementChild.id; 
                if(builder.mobile) builder.gui.DescriptionCard_Show();
                builder.gui.Skill_DisplayDescription(id); 
            },
            double: () => {
                const skill = builder.exp.skills.get(e.firstElementChild.id);
                if(skill) {
                    Array.from(Array(skill.state)).forEach(() => e.dispatchEvent(new MouseEvent("contextmenu", { detail: -1 })));
                } else {
                    [0,1].forEach(() => e.click());
                }
            },
            element: e,
            mobile: builder.mobile
        });
    }

    // Perk deck buttons //
    for(const e of document.getElementsByClassName("pk_deck")) {
        // Values for successHolding being a boolean and holding an ID for timeouts
        let successHolding = false;
        e.addEventListener("click", ev => {
            if(successHolding) {
                ev.stopPropagation();
                successHolding = false;
                return;
            }

            const id = e.id; 
            // const pastId = builder.exp.perkDeck;
            const pastUnlock = builder.exp.perkDeckUnlock;
            if (builder.exp.perkDeck === id) return; 

            builder.exp.perkDeck = id;
            builder.perkDeckUnlockHandler();
            builder.gui.PerkDeck_Select(e);

            if(pastUnlock && (pastUnlock != builder.exp.perkDeckUnlock)) builder.gui.HandleUnlocks({
                type: "perkDeckUnlock",
                id: pastUnlock,
                unlocks: builder.dbs.get("perk_decks").get(pastUnlock).unlocks
            });
            
            if(ev.isTrusted || ev.detail == -1) {
                window.history.pushState(
                    Util.makeState(null, builder.exp, builder.gui.Tab_Current),
                    `used perk ${id}`,
                    builder.io.GetEncodedBuild()
                );
            }
        });

        if(!builder.mobile) {
            e.addEventListener("mouseenter", () => {
                const id = e.id; 
                if (document.getElementsByClassName("pk_description")[0].dataset.perkdeck !== id) {
                    builder.gui.PerkDeck_DisplayDescription(id); 
                }
            });
        } 

        new UIEventHandler({
            double: () => null,
            hold: () => {
                successHolding = true;
                let id = e.firstElementChild.id; 
                if(builder.mobile) {
                    builder.gui.DescriptionCard_Show();
                    id = e.id;
                }
                builder.gui.PerkDeck_DisplayDescription(id); 
            },
            element: e,
            mobile: builder.mobile
        });
    } 

    // Perk card clickables (with boosts) //
    for(const e of document.querySelectorAll(".pk_deck_cards .pk_has_boost")) {
        // left-click
        e.addEventListener("click", ev => {

            // expecting a left-click
            if (!e.id || !builder.dbs.get("perk_cards").get(e.id).has_copycat_boost || ev.button != 0) return; 

            const pastUnlock = builder.exp.perkDeckUnlock;
            builder.changeCardBoost(e);

            //const pastUnlock = builder.exp.perkDeckUnlock;
            if (pastUnlock && (builder.exp.perkDeckUnlock != pastUnlock)){
                builder.gui.HandleUnlocks({
                    type: "perkDeckUnlock",
                    id: pastUnlock,
                    unlocks: builder.dbs.get("perk_decks").get(pastUnlock).unlocks
                });
            }

            builder.gui.PerkCard_DisplayDescription(e); 

            if(ev.isTrusted || ev.detail == -1) {
                window.history.pushState(
                    Util.makeState(null, builder.exp, builder.gui.Tab_Current),
                    `used perk boost ${e.id}`,
                    builder.io.GetEncodedBuild()
                );
            }            
        });
        
        // right-click
        e.addEventListener("contextmenu", ev => {
            ev.preventDefault(); 

            // if we're not expecting a right-click, do nothing.
            if (!e.id || !builder.dbs.get("perk_cards").get(e.id).has_copycat_boost || ev.button != 2) return; 

            const pastUnlock = builder.exp.perkDeckUnlock;
            builder.changeCardBoost(e, -1);

            //const pastUnlock = builder.exp.perkDeckUnlock;
            if (pastUnlock && (builder.exp.perkDeckUnlock != pastUnlock)){
                builder.gui.HandleUnlocks({
                    type: "perkDeckUnlock",
                    id: pastUnlock,
                    unlocks: builder.dbs.get("perk_decks").get(pastUnlock).unlocks
                });
            }

            builder.gui.PerkCard_DisplayDescription(e); 

            if(ev.isTrusted || ev.detail == -1) {
                window.history.pushState(
                    Util.makeState(null, builder.exp, builder.gui.Tab_Current),
                    `used perk boost ${e.id}`,
                    builder.io.GetEncodedBuild()
                );
            } 
                       
        });
    }


    // Perk deck cards highlight // 
    if(builder.mobile) {
        document.querySelectorAll(".pk_deck_cards").forEach(ring => 
            builder.scrollTransformer.addContext(ring, -1, false)
        );
        document.querySelectorAll(".pk_deck_cards > div").forEach(e => {
            new UIEventHandler({
                click: () => e.parentElement.parentElement.dispatchEvent(new MouseEvent("click", { detail: -1 })),
                hold: () => {
                    builder.gui.DescriptionCard_Show();
                    builder.gui.PerkCard_DisplayDescription(e); 
                },
                double: () => null,
                mobile: true,
                element: e,
                propagate: true
            });
        });
    } else {
        document.querySelectorAll(".pk_deck_cards > div").forEach(e => {
            e.addEventListener("mouseenter", () => {
                builder.gui.PerkCard_HoveringHighlightOn(e); 
                builder.gui.PerkCard_DisplayDescription(e); 
            });

            e.addEventListener("mouseleave", () => {
                builder.gui.PerkCard_HoveringHighlightOff(); 
            });

            new UIEventHandler({
                click: () => e.parentElement.dispatchEvent(new MouseEvent("click", { detail: -1 })),
                hold: () => {
                    builder.gui.PerkCard_DisplayDescription(e); 
                },
                double: () => null,
                mobile: false,
                element: e
            });
        });
    }

    // Armor icon buttons //
    for(const e of document.getElementsByClassName("arm_icon")) {
        let successHolding = false;

        e.addEventListener("click", ev => {
            if(successHolding) {
                successHolding = false;
                ev.stopPropagation();
                return;
            }

            const id = e.firstElementChild.id;
            if (builder.exp.armor === id || e.classList.contains("arm_locked")) return;

            builder.exp.armor = id;
            builder.stats.setBaseStats(builder.dbs.get("armors").get(id).stats);
            builder.gui.Armor_Select(e); 
            builder.gui.Armor_DisplayDescriptionCard(id);

            if(ev.isTrusted || ev.detail == -1) {
                window.history.pushState(
                    Util.makeState(null, builder.exp, builder.gui.Tab_Current),
                    `used armor ${id}`,
                    builder.io.GetEncodedBuild()
                );
            }
        });

        if(!builder.mobile) e.addEventListener("mouseenter", () => {
            builder.gui.Armor_DisplayDescriptionCard(e.firstElementChild.id);
        });

        new UIEventHandler({
            hold: () => {
                successHolding = true;
                const id = e.firstElementChild.id; 
                if(builder.mobile) builder.gui.DescriptionCard_Show();
                builder.gui.Armor_DisplayDescriptionCard(id);
            },
            double: () => null,
            element: e,
            mobile: builder.mobile
        });
    }

    // Throwables icon buttons // 
    for(const e of document.getElementsByClassName("th_icon")) {
        let successHolding = false;

        e.addEventListener("click", ev => {
            if(successHolding) {
                ev.stopPropagation();
                successHolding = false;
                return;
            }

            const id = e.firstElementChild.id;
            if (builder.exp.throwable === id || e.classList.contains("th_locked")) return;

            builder.exp.throwable = id;
            builder.gui.Throwable_Select(e);

            if(ev.isTrusted || ev.detail == -1) {
                window.history.pushState(
                    Util.makeState(null, builder.exp, builder.gui.Tab_Current),
                    `used throwable ${id}`,
                    builder.io.GetEncodedBuild()
                );
            }
        });

        if(!builder.mobile) e.addEventListener("mouseenter", () => builder.gui.Throwable_DisplayDescriptionCard(e.firstElementChild.id));

        new UIEventHandler({
            hold: () =>  {
                successHolding = true;
                const id = e.firstElementChild.id; 
                if(builder.mobile) builder.gui.DescriptionCard_Show();
                builder.gui.Throwable_DisplayDescriptionCard(id);
            },
            double: () => null,
            element: e,
            mobile: builder.mobile
        });
    }

    // Deployables icon buttons //
    for(const e of document.getElementsByClassName("dp_icon")) {
        let successHolding = false;

        e.addEventListener("click", ev => {
            if(successHolding) {
                ev.stopPropagation();
                successHolding = false;
                return;
            }

            const id = e.firstElementChild.id;
            if (builder.exp.deployable === id || e.classList.contains("dp_locked")) return;
            if(builder.exp.deployableSecondary === id) {
                builder.exp.deployableSecondary = null;
                builder.gui.DeployableSecondary_Unselect();
            }
            builder.exp.deployable = id;
            builder.gui.Deployable_Select(e);

            if(ev.isTrusted || ev.detail == -1) {
                window.history.pushState(
                    Util.makeState(null, builder.exp, builder.gui.Tab_Current),
                    `used perk ${id}`,
                    builder.io.GetEncodedBuild()
                );
            }
        });

        e.addEventListener("contextmenu", ev => {
            ev.preventDefault(); 
            const jackOfAllTradesSkill = builder.exp.skills.get("jack_of_all_trades");
            const id = e.firstElementChild.id;
            if (jackOfAllTradesSkill && jackOfAllTradesSkill.state == 2 && builder.exp.deployable !== id) {
                builder.exp.deployableSecondary = id;
                builder.gui.Deployable_SelectSecondary(e);

                if(ev.isTrusted || ev.detail == -1) {
                    window.history.pushState(
                        Util.makeState(null, builder.exp, builder.gui.Tab_Current),
                        `used perk ${id}`,
                        builder.io.GetEncodedBuild()
                    );
                }
            } else {
                e.dispatchEvent(new MouseEvent("click", { detail: -1 }));
            } 
            
        });
        if(!builder.mobile) e.addEventListener("mouseenter", () => 
            builder.gui.Deployable_DisplayDescriptionCard(e.firstElementChild.id)
        );

        new UIEventHandler({
            hold: () => {
                successHolding = true;
                const id = e.firstElementChild.id; 
                if(builder.mobile) builder.gui.DescriptionCard_Show();
                builder.gui.Deployable_DisplayDescriptionCard(id);
            },
            element: e,
            mobile: builder.mobile
        });
    }

    // Share build section //
    document.getElementById("io_copy_btn").addEventListener("click", () => {
        const e = document.getElementById("io_share_link"); 

        e.select();
        navigator.clipboard.writeText(e.value);
        //document.execCommand("copy"); //it's deprecated.
        e.blur(); 

        builder.gui.IO_CopyLinkFlash(); 
    });

    { // Natively share your build
        const button = document.getElementById("io_share_button");
        if("share" in navigator) {
            button.addEventListener("click", () =>
                navigator.share({
                    title: "PD2Builder",
                    text: "Check out this build!",
                    url: builder.io.GetEncodedBuild()
                })
            );
        } else {
            button.style.display = "none";
        }
    }


    // When in popups, do like the popups do (history pop event)
    window.onpopstate = async e => {
        if(!e.state) return;
        for(const [type, value] of Object.entries(e.state)) {
            switch(type) {
            case "lang":
                localStorage.setItem("lang", value);
                document.getElementById("langDrop").value = value;
                builder.lang.loadDictionary(await fetch(`./lang/${value}.json`).then(res => res.json()));
                builder.lang.used = value;
                builder.loadLanguage(value);
                break;
            case "tab":
                sessionStorage.setItem("curTab", value);
                builder.gui.Tab_ChangeTo(value);
                break;
            case "skills":
                for(const [key, value2] of [...builder.exp.skills].reverse()) {
                    const originalValue = value[key];
                    const e = document.getElementById(key).parentElement;
                    if(!originalValue) {
                        for(let val = value2.state; val > 0; val--) {
                            e.dispatchEvent(new MouseEvent("contextmenu"));
                        }
                    } else if(value2.state > originalValue.state) {
                        e.dispatchEvent(new MouseEvent("contextmenu"));
                    } else if(value2.state < originalValue.state) {
                        e.click();
                    }
                    delete value[key];
                }
                for(const [key, originalValue] of Object.entries(value)) {
                    for(let val = 0; val < originalValue.state; val++) {
                        document.getElementById(key).parentElement.click();
                    }
                } 
                break;
            case "perkDeck":
                if(!value) {
                    builder.exp.perkDeck = null;
                    builder.gui.PerkDeck_Unselect();
                    builder.gui.PerkCard_HoveringHighlightOff();
                    break;
                }
                document.getElementById(value).click();
                break;
            case "armor":
                if(!value) {
                    builder.exp.armor = null;
                    builder.gui.Armor_Unselect();
                    break;
                }
                //fallthrough
            case "throwable":
                if(!value) {
                    builder.exp.throwable = null;
                    builder.gui.Throwable_Unselect();
                    break;
                }
                //fallthrough
            case "deployable":
                if(!value) {
                    builder.exp.deployable = null;
                    const query = document.querySelector(".dp_primary, .dp_selected");
                    if(query) builder.gui.Deployable_Unselect(query);
                    break;
                }
                document.getElementById(value).parentElement.click();
                break;
            case "deployableSecondary":
                if(!value) {
                    builder.exp.deployableSecondary = null;
                    const query = document.querySelector(".dp_secondary");
                    if(query) builder.gui.Deployable_Unselect(query);
                    break;
                }
                document.getElementById(value).parentElement.dispatchEvent(new MouseEvent("contextmenu"));
                break;
            }
        }
    };

    // Wait for all DBs to load before loading anything //
    await builder.fetchPromises;

    // Load language
    builder.lang.loadDictionary(await fetchLang);
    builder.loadLanguage(builder.lang.curLang);
    
    // Check on Service Worker and if its not in dev environment
    if("serviceWorker" in navigator /*){//*/&& location.port !== "9999") {
        navigator.serviceWorker.register("./sw.js").then(req => {
            req.onupdatefound = () => {
                const sw = req.installing;
                sw.onstatechange = () => {
                    if(sw.state !== "installed" || !navigator.serviceWorker.controller) return;
                    if(window.confirm(builder.lang.get("system.update"))) {
                        location.reload();
                    }
                }; 
            };
        });
    }


    // Prepare document when first opening // 
    builder.gui.Tab_ChangeTo("tab_skills_page");
    builder.gui.Skill_UpdatePointsRemaining(builder.exp.skills.points); 

    builder.gui.Tree_ChangeTo("sk_mastermind_container");

    // Load build if it has one
    if (builder.io.HasToLoadBuild()) {
        builder.io.LoadBuildFromIterable(new URLSearchParams(window.location.search));
    }
    {
        let tabChange = window.sessionStorage.getItem("curTab") || "tab_skills_page";
        if (document.getElementById(tabChange) == null) tabChange = "tab_skills_page";
        builder.gui.HandleRequirements(tabChange.replace(/tab_|_page/g, ""));
        builder.gui.Tab_ChangeTo(tabChange);
        window.history.replaceState(Util.makeState(builder.lang.used, builder.exp, tabChange), "PD2 Builder");
    }
    
    // Disable the loading spinner so people know that they should touch things now //
    builder.gui.LoadingSpinner_Display(false);
};

window.builder = builder; //make the builder instance visible so people can hack it and we can debug it
