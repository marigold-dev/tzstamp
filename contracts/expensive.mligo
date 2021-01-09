type hash_ = bytes
type storage = (address , hash_ list) big_map

type action =
| Add_hash of hash_

let add_hash (p , s : hash_ * storage) =
  let key = Tezos.sender in
  let s_ =
    match Big_map.find_opt key s with
    | Some(lst) -> Big_map.update key (Some (p :: lst)) s
    | None -> Big_map.update key (Some [p]) s
  in s_

let main (p,s: action * storage) =
 let s_ =
   match p with
   | Add_hash p_ -> add_hash (p_ , s)
 in
 ([] : operation list), s_
